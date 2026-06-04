const express = require('express');
const router = express.Router();
const { db, activeCol } = require('../database');

// Computed fields helper
function withComputed(emp) {
  const fteHours = emp.ftePercent * 40;
  const totalInternal = (emp.meetingHours || 0) + (emp.supReceivedHours || 0) +
    (emp.supGivenHours || 0) + (emp.therapyHours || 0) + (emp.roleHours || 0);

  const assignment = db.get('assignments').find({ employeeId: emp.id }).value();
  const totalFrameworks = assignment
    ? (assignment.hours || 0) + (assignment.specEdHours || 0) + (assignment.kinderHours || 0)
    : 0;

  const totalAllocated = totalInternal + totalFrameworks + (emp.officeHours || 0);
  const balance = Math.round((fteHours - totalAllocated) * 100) / 100;

  return { ...emp, fteHours, totalInternal, totalFrameworks, totalAllocated, balance };
}

router.get('/', (req, res) => {
  let emps = db.get('employees').value();
  if (req.query.activeOnly) emps = emps.filter(e => e.status !== 'inactive' && e.status !== 'maternity');
  res.json(emps.map(withComputed));
});

router.get('/:id', (req, res) => {
  const emp = db.get('employees').find({ id: +req.params.id }).value();
  if (!emp) return res.status(404).json({ error: 'לא נמצא' });
  res.json(withComputed(emp));
});

router.put('/:id', (req, res) => {
  const id = +req.params.id;
  const emp = db.get('employees').find({ id }).value();
  if (!emp) return res.status(404).json({ error: 'לא נמצא' });

  const allowed = ['displayName','firstName','lastName','ftePercent','type','status','isSubstitute',
    'meetingHours','supReceivedHours','supGivenHours','therapyHours',
    'roleHours','roleName','officeHours','notes'];
  const update = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

  db.get('employees').find({ id }).assign(update).write();

  // כשעובד עובר לחל"ד או לא פעיל — ניקוי פסיכולוג בלבד (שעות ונתונים נשמרים)
  if (update.status === 'maternity' || update.status === 'inactive') {
    ['assignments', 'kinderAssignments'].forEach(col => {
      const items = db.get(activeCol(col)).filter({ employeeId: id }).value();
      items.forEach(a => {
        db.get(activeCol(col)).find({ id: a.id }).assign({ employeeId: 0 }).write();
      });
    });
  }

  const updated = db.get('employees').find({ id }).value();
  res.json(withComputed(updated));
});

router.post('/', (req, res) => {
  const nextId = db.get('_nextId.employees').value();
  const emp = {
    id: nextId,
    displayName: req.body.displayName || '',
    firstName: req.body.firstName || '',
    lastName: req.body.lastName || '',
    ftePercent: req.body.ftePercent || 1.0,
    type: req.body.type || 'expert',
    status: 'active',
    isSubstitute: false,
    meetingHours: 0, supReceivedHours: 0, supGivenHours: 0,
    therapyHours: 0, roleHours: 0, roleName: '',
    officeHours: 0, notes: ''
  };
  db.get('employees').push(emp).write();
  db.set('_nextId.employees', nextId + 1).write();
  res.json(withComputed(emp));
});

router.delete('/:id', (req, res) => {
  const id = +req.params.id;
  db.get('employees').remove({ id }).write();
  // Framework slots stay as unfilled (employeeId=0) so alerts can detect the gap
  db.get('assignments').filter({ employeeId: id }).value()
    .forEach(a => db.get('assignments').find({ id: a.id }).assign({ employeeId: 0 }).write());
  // Kinder assignments are fully removed (one-to-one, no concept of an unfilled slot)
  db.get('kinderAssignments').remove({ employeeId: id }).write();
  res.json({ ok: true });
});

module.exports = router;
