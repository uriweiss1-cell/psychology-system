const express = require('express');
const router = express.Router();
const { db, activeCol } = require('../database');

// Computed fields helper — uses active collection for both employees and assignments
function withComputed(emp) {
  const fteHours = Math.ceil(emp.ftePercent * 40);
  const totalInternal = (emp.meetingHours || 0) + (emp.supReceivedHours || 0) +
    (emp.supGivenHours || 0) + (emp.therapyHours || 0) + (emp.roleHours || 0);

  const assignment = db.get(activeCol('assignments')).find({ employeeId: emp.id }).value();
  const totalFrameworks = assignment
    ? (assignment.hours || 0) + (assignment.specEdHours || 0) + (assignment.kinderHours || 0)
    : 0;

  const freeHours = Math.round((fteHours - totalInternal - totalFrameworks) * 100) / 100;
  const balance = freeHours;

  return { ...emp, fteHours, totalInternal, totalFrameworks, freeHours, balance };
}

router.get('/', (req, res) => {
  const col = activeCol('employees');
  let emps = db.get(col).value();
  if (req.query.activeOnly) emps = emps.filter(e => e.status !== 'inactive' && e.status !== 'maternity');
  res.json(emps.map(withComputed));
});

router.get('/:id', (req, res) => {
  const emp = db.get(activeCol('employees')).find({ id: +req.params.id }).value();
  if (!emp) return res.status(404).json({ error: 'לא נמצא' });
  res.json(withComputed(emp));
});

router.put('/:id', (req, res) => {
  const col = activeCol('employees');
  const id  = +req.params.id;
  const emp = db.get(col).find({ id }).value();
  if (!emp) return res.status(404).json({ error: 'לא נמצא' });

  const allowed = ['displayName','firstName','lastName','ftePercent','type','status','isSubstitute',
    'meetingHours','supReceivedHours','supGivenHours','therapyHours',
    'roleHours','roleName','officeHours','notes'];
  const update = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

  db.get(col).find({ id }).assign(update).write();

  // When returning from maternity/inactive → set meetingHours to 4 if currently 0
  if (update.status === 'active') {
    const current = db.get(col).find({ id }).value();
    if (!current.meetingHours) {
      db.get(col).find({ id }).assign({ meetingHours: 4 }).write();
    }
  }

  // When going to maternity/inactive — remove from assignments (in active collection)
  if (update.status === 'maternity' || update.status === 'inactive') {
    ['assignments', 'kinderAssignments'].forEach(name => {
      const items = db.get(activeCol(name)).filter({ employeeId: id }).value();
      items.forEach(a => {
        db.get(activeCol(name)).find({ id: a.id }).assign({ employeeId: 0 }).write();
      });
    });
  }

  const updated = db.get(col).find({ id }).value();
  res.json(withComputed(updated));
});

router.post('/', (req, res) => {
  const col    = activeCol('employees');
  const nextId = db.get('_nextId.employees').value();
  const emp = {
    id: nextId,
    displayName: req.body.displayName || '',
    firstName:   req.body.firstName || '',
    lastName:    req.body.lastName || '',
    ftePercent:  req.body.ftePercent || 1.0,
    type:        req.body.type || 'expert',
    status:      'active',
    isSubstitute: false,
    meetingHours: 4, supReceivedHours: 0, supGivenHours: 0,
    therapyHours: 0, roleHours: 0, roleName: '',
    officeHours: 0, notes: ''
  };
  db.get(col).push(emp).write();
  db.set('_nextId.employees', nextId + 1).write();
  res.json(withComputed(emp));
});

router.delete('/:id', (req, res) => {
  const col = activeCol('employees');
  const id  = +req.params.id;
  db.get(col).remove({ id }).write();
  db.get(activeCol('assignments')).filter({ employeeId: id }).value()
    .forEach(a => db.get(activeCol('assignments')).find({ id: a.id }).assign({ employeeId: 0 }).write());
  db.get(activeCol('kinderAssignments')).remove({ employeeId: id }).write();
  res.json({ ok: true });
});

module.exports = router;
