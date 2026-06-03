const express = require('express');
const router = express.Router();
const { db, activeCol } = require('../database');

router.get('/', (req, res) => {
  const col = activeCol('assignments');
  const assignments = db.get(col).value();
  const employees = db.get('employees').value();
  const frameworks = db.get('frameworks').value();
  const enriched = assignments.map(a => {
    const emp = employees.find(e => e.id === a.employeeId);
    const fw = frameworks.find(f => f.id === a.frameworkId);
    return { ...a, employeeName: emp?.displayName || '?', frameworkName: fw?.name || '(לא מוגדר)' };
  });
  res.json(enriched);
});

router.post('/', (req, res) => {
  const col = activeCol('assignments');
  const ids = db.get(col).value().map(a => a.id);
  const nextId = ids.length ? Math.max(...ids) + 1 : 1;
  const a = {
    id: nextId,
    employeeId: +req.body.employeeId || 0,
    frameworkId: +req.body.frameworkId || 0,
    hours: +req.body.hours || 0,
    specEdHours: +req.body.specEdHours || 0,
    kinderHours: +req.body.kinderHours || 0,
  };
  db.get(col).push(a).write();
  const emp = db.get('employees').find({ id: a.employeeId }).value();
  const fw = db.get('frameworks').find({ id: a.frameworkId }).value();
  res.json({ ...a, employeeName: emp?.displayName || '?', frameworkName: fw?.name || '(לא מוגדר)' });
});

router.put('/:id', (req, res) => {
  const col = activeCol('assignments');
  const id = +req.params.id;
  const a = db.get(col).find({ id }).value();
  if (!a) return res.status(404).json({ error: 'לא נמצא' });
  const allowed = ['employeeId','frameworkId','hours','specEdHours','kinderHours'];
  const update = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = +req.body[k] || 0; });
  db.get(col).find({ id }).assign(update).write();
  const updated = db.get(col).find({ id }).value();
  const emp = db.get('employees').find({ id: updated.employeeId }).value();
  const fw = db.get('frameworks').find({ id: updated.frameworkId }).value();
  res.json({ ...updated, employeeName: emp?.displayName || '?', frameworkName: fw?.name || '(לא מוגדר)' });
});

router.delete('/:id', (req, res) => {
  const col = activeCol('assignments');
  db.get(col).remove({ id: +req.params.id }).write();
  res.json({ ok: true });
});

router.get('/summary', (req, res) => {
  const col = activeCol('assignments');
  const frameworks = db.get('frameworks').value();
  const assignments = db.get(col).value();
  const employees = db.get('employees').value();
  const summary = frameworks.filter(f => f.type !== 'kindergarten').map(fw => {
    const fwAssignments = assignments.filter(a => a.frameworkId === fw.id);
    const assignedSchoolHours = fwAssignments.reduce((s, a) => s + (a.hours || 0), 0);
    const assignedSpecEdHours = fwAssignments.reduce((s, a) => s + (a.specEdHours || 0), 0);
    const psychologists = fwAssignments.map(a => {
      const emp = employees.find(e => e.id === a.employeeId);
      return emp?.displayName || '?';
    });
    return { ...fw, assignedSchoolHours, assignedSpecEdHours, totalAssigned: assignedSchoolHours + assignedSpecEdHours, psychologists };
  });
  res.json(summary);
});

module.exports = router;
