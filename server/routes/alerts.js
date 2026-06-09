const express = require('express');
const router = express.Router();
const { db, activeCol } = require('../database');

// Find closest freeHoursTarget for a given ftePercent
// Special rule: 0.9 rounds to 1.0
function getTargetHours(ftePercent, targets) {
  if (!targets || !targets.length) return null;
  const fte = ftePercent >= 0.87 ? 1.0 : ftePercent; // 0.9 → 1.0
  let closest = targets[0];
  let minDist = Math.abs(fte - targets[0].fte);
  targets.forEach(t => {
    const d = Math.abs(fte - t.fte);
    if (d < minDist) { minDist = d; closest = t; }
  });
  return closest.hours;
}

router.get('/', (req, res) => {
  const employees = db.get(activeCol('employees')).value().filter(e => e.status === 'active' || !e.status);
  const frameworks = db.get('frameworks').value();
  const assignments = db.get(activeCol('assignments')).value();
  const kinderAssignments = db.get(activeCol('kinderAssignments')).value();
  const settings = db.get('settings').value();
  const freeHoursTargets = settings.freeHoursTargets || [];

  // שעות פנויות — חריגה מהיעד
  const freeHoursAlerts = employees.map(emp => {
    const fteHours   = Math.ceil(emp.ftePercent * 40);
    const internal   = (emp.meetingHours||0) + (emp.supReceivedHours||0) +
                       (emp.supGivenHours||0) + (emp.therapyHours||0) + (emp.roleHours||0);
    const planAsgn   = assignments.find(a => a.employeeId === emp.id && a.frameworkId === 0);
    const frameworks = planAsgn ? (planAsgn.hours||0) + (planAsgn.specEdHours||0) + (planAsgn.kinderHours||0) : 0;
    const freeHours  = Math.round((fteHours - internal - frameworks) * 100) / 100;
    const target     = getTargetHours(emp.ftePercent, freeHoursTargets);
    if (target === null) return null;
    const gap = Math.round((freeHours - target) * 100) / 100;
    if (gap > 2)           return { id: emp.id, displayName: emp.displayName, gap, type: 'over' };
    if (freeHours < 2 || gap < -2) return { id: emp.id, displayName: emp.displayName, gap, type: 'under' };
    return null;
  }).filter(Boolean);

  // פסיכולוגים ללא שיבוץ לאף מסגרת
  const assignedEmpIds = new Set([
    ...assignments.map(a => a.employeeId),
    ...kinderAssignments.map(a => a.employeeId),
  ]);
  const unassignedEmployees = employees
    .filter(e => !assignedEmpIds.has(e.id))
    .map(e => ({ id: e.id, displayName: e.displayName }));

  // מסגרות ללא פסיכולוג פעיל משובץ (לא כולל חינוך מיוחד עצמאי)
  const activeEmpIds = new Set(employees.map(e => e.id)); // employees כבר מסונן לפעילים
  const schoolFrameworks = frameworks.filter(f => f.type === 'school' || f.type === 'special_ed');
  const assignedActiveFwIds = new Set(
    assignments
      .filter(a => activeEmpIds.has(a.employeeId) && a.employeeId > 0)
      .map(a => a.frameworkId)
  );
  const unassignedFrameworks = schoolFrameworks
    .filter(f => !assignedActiveFwIds.has(f.id))
    .map(f => ({ id: f.id, name: f.name, type: f.type }));

  // מסגרות עם חלון פנוי — פסיכולוג עזב/נמחק ואין מחליף (גם אם יש פסיכולוג אחר)
  const vacantSlotFwIds = new Set(
    assignments.filter(a => a.employeeId === 0).map(a => a.frameworkId)
  );
  const frameworksWithVacancy = schoolFrameworks
    .filter(f => vacantSlotFwIds.has(f.id) && assignedActiveFwIds.has(f.id)) // יש גם מאויש וגם פנוי
    .map(f => ({ id: f.id, name: f.name, type: f.type }));

  // הדרכות — פער בין מתוכנן לבפועל (סף: 0.5 שעות)
  const supervisions = db.get(activeCol('supervisions')).value();
  const supAlerts = employees.map(emp => {
    const name = emp.displayName;
    // שעות שמקבל בפועל
    const actualReceived = supervisions.reduce((sum, s) => {
      if ((s.superviseeNames || []).includes(name)) return sum + (s.hoursPerSession || 1);
      return sum;
    }, 0);
    // שעות שנותן בפועל
    const actualGiven = supervisions.reduce((sum, s) => {
      if (s.supervisorName === name) {
        const isIndividual = s.type === 'educational' || s.type === 'clinical';
        return sum + (isIndividual
          ? (s.superviseeNames || []).length * (s.hoursPerSession || 1)
          : (s.hoursPerSession || 1.5));
      }
      return sum;
    }, 0);
    const plannedReceived = emp.supReceivedHours || 0;
    const plannedGiven    = emp.supGivenHours    || 0;
    const gapReceived = Math.round((actualReceived - plannedReceived) * 100) / 100;
    const gapGiven    = Math.round((actualGiven    - plannedGiven)    * 100) / 100;
    const alerts = [];
    if (Math.abs(gapReceived) > 0.5) alerts.push({ field: 'מקבל', gap: gapReceived, actual: actualReceived, planned: plannedReceived });
    if (Math.abs(gapGiven)    > 0.5) alerts.push({ field: 'נותן',  gap: gapGiven,    actual: actualGiven,    planned: plannedGiven });
    if (!alerts.length) return null;
    return { id: emp.id, displayName: emp.displayName, alerts };
  }).filter(Boolean);

  // פסיכולוגים עם חריגת שעות
  const overBudget = employees
    .map(emp => {
      const fteHours = Math.ceil(emp.ftePercent * 40);
      const internal = (emp.meetingHours || 0) + (emp.supReceivedHours || 0) +
        (emp.supGivenHours || 0) + (emp.therapyHours || 0) + (emp.roleHours || 0) + (emp.officeHours || 0);
      const planAsgn   = assignments.find(a => a.employeeId === emp.id && a.frameworkId === 0);
      const frameworks = planAsgn ? (planAsgn.hours||0) + (planAsgn.specEdHours||0) + (planAsgn.kinderHours||0) : 0;
      const total = internal + frameworks;
      const balance = Math.round((fteHours - total) * 100) / 100;
      return { id: emp.id, displayName: emp.displayName, balance, fteHours };
    })
    .filter(e => e.balance < -0.5);

  // פערים בין מתוכנן לבפועל — בתי ספר
  const schoolGapAlerts = employees.map(emp => {
    const planAsgn   = assignments.find(a => a.employeeId === emp.id && a.frameworkId === 0);
    const plannedSchool = planAsgn ? (planAsgn.hours||0) + (planAsgn.specEdHours||0) : 0;
    const realAsgns  = assignments.filter(a => a.employeeId === emp.id && a.frameworkId > 0);
    const actualSchool = realAsgns.reduce((s,a) => s + (a.hours||0) + (a.specEdHours||0), 0);
    const gap = Math.round((actualSchool - plannedSchool) * 100) / 100;
    if (gap === 0) return null;
    return { id: emp.id, displayName: emp.displayName, gap, planned: plannedSchool, actual: actualSchool };
  }).filter(Boolean);

  // פערים בין מתוכנן לבפועל — גנים (חובה=1ש, התפתחותי=1.5ש, תקשורת=מתעלמים)
  const kinderGapAlerts = employees.map(emp => {
    const planAsgn     = assignments.find(a => a.employeeId === emp.id && a.frameworkId === 0);
    const plannedKinder = planAsgn ? (planAsgn.kinderHours||0) : 0;
    const empKinder    = kinderAssignments.filter(a => a.employeeId === emp.id);
    const actualKinder = empKinder.reduce((s, a) => {
      const ag = (a.ageGroup || '').trim();
      if (ag === 'חובה') return s + 1;
      if (ag === 'התפתחותי') return s + 1.5;
      return s; // תקשורת ואחרים — מתעלמים
    }, 0);
    const gap = Math.round((actualKinder - plannedKinder) * 100) / 100;
    if (gap === 0) return null;
    return { id: emp.id, displayName: emp.displayName, gap, planned: plannedKinder, actual: actualKinder };
  }).filter(Boolean);

  // עובדים שאינם מדריכי הדרכה חינוכית פרטנית ואינם מודרכים בה
  const educationalSups      = supervisions.filter(s => s.type === 'educational');
  const edSupervisors        = new Set(educationalSups.map(s => s.supervisorName).filter(Boolean));
  const edSupervisees        = new Set(educationalSups.flatMap(s => s.superviseeNames || []));
  const noEdSupervision      = employees
    .filter(e => !edSupervisors.has(e.displayName) && !edSupervisees.has(e.displayName))
    .map(e => ({ id: e.id, displayName: e.displayName }));

  res.json({ unassignedEmployees, unassignedFrameworks, frameworksWithVacancy, overBudget, freeHoursAlerts, supAlerts, noEdSupervision, schoolGapAlerts, kinderGapAlerts });
});

module.exports = router;
