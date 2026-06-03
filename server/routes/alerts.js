const express = require('express');
const router = express.Router();
const { db, activeCol } = require('../database');

router.get('/', (req, res) => {
  const employees = db.get('employees').value().filter(e => e.status === 'active' || !e.status);
  const frameworks = db.get('frameworks').value();
  const assignments = db.get(activeCol('assignments')).value();
  const kinderAssignments = db.get(activeCol('kinderAssignments')).value();

  // פסיכולוגים ללא שיבוץ לאף מסגרת
  const assignedEmpIds = new Set([
    ...assignments.map(a => a.employeeId),
    ...kinderAssignments.map(a => a.employeeId),
  ]);
  const unassignedEmployees = employees
    .filter(e => !assignedEmpIds.has(e.id))
    .map(e => ({ id: e.id, displayName: e.displayName }));

  // מסגרות ללא פסיכולוג משובץ (לא כולל חינוך מיוחד עצמאי)
  const schoolFrameworks = frameworks.filter(f => f.type === 'school' || f.type === 'special_ed');
  const assignedFwIds = new Set(assignments.map(a => a.frameworkId));
  const unassignedFrameworks = schoolFrameworks
    .filter(f => !assignedFwIds.has(f.id))
    .map(f => ({ id: f.id, name: f.name, type: f.type }));

  // פסיכולוגים עם חריגת שעות
  const overBudget = employees
    .map(emp => {
      const fteHours = Math.ceil(emp.ftePercent * 40);
      const internal = (emp.meetingHours || 0) + (emp.supReceivedHours || 0) +
        (emp.supGivenHours || 0) + (emp.therapyHours || 0) + (emp.roleHours || 0) + (emp.officeHours || 0);
      const asgn = assignments.find(a => a.employeeId === emp.id);
      const frameworks = asgn ? (asgn.hours || 0) + (asgn.specEdHours || 0) + (asgn.kinderHours || 0) : 0;
      const total = internal + frameworks;
      const balance = Math.round((fteHours - total) * 100) / 100;
      return { id: emp.id, displayName: emp.displayName, balance, fteHours };
    })
    .filter(e => e.balance < -0.5);

  res.json({ unassignedEmployees, unassignedFrameworks, overBudget });
});

module.exports = router;
