const express = require('express');
const router = express.Router();
const { db } = require('../database');

// Get all school assignments with enriched data
router.get('/', (req, res) => {
  const assignments = db.get('assignments').value();
  const employees = db.get('employees').value();
  const frameworks = db.get('frameworks').value();

  const enriched = assignments.map(a => {
    const emp = employees.find(e => e.id === a.employeeId);
    const fw = frameworks.find(f => f.id === a.frameworkId);
    return { ...a, employeeName: emp?.displayName || '?', frameworkName: fw?.name || '(לא מוגדר)' };
  });
  res.json(enriched);
});

router.put('/:id', (req, res) => {
  const id = +req.params.id;
  const a = db.get('assignments').find({ id }).value();
  if (!a) return res.status(404).json({ error: 'לא נמצא' });
  const allowed = ['frameworkId','hours','specEdHours','kinderHours'];
  const update = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
  db.get('assignments').find({ id }).assign(update).write();

  const updated = db.get('assignments').find({ id }).value();
  const emp = db.get('employees').find({ id: updated.employeeId }).value();
  const fw = db.get('frameworks').find({ id: updated.frameworkId }).value();
  res.json({ ...updated, employeeName: emp?.displayName || '?', frameworkName: fw?.name || '(לא מוגדר)' });
});

// Summary per framework: total hours assigned vs allocated
router.get('/summary', (req, res) => {
  const frameworks = db.get('frameworks').value();
  const assignments = db.get('assignments').value();
  const employees = db.get('employees').value();

  const summary = frameworks.filter(f => f.type !== 'kindergarten').map(fw => {
    const fwAssignments = assignments.filter(a => a.frameworkId === fw.id);
    const assignedSchoolHours = fwAssignments.reduce((s, a) => s + (a.hours || 0), 0);
    const assignedSpecEdHours = fwAssignments.reduce((s, a) => s + (a.specEdHours || 0), 0);
    const psychologists = fwAssignments.map(a => {
      const emp = employees.find(e => e.id === a.employeeId);
      return emp?.displayName || '?';
    });
    return {
      ...fw,
      assignedSchoolHours,
      assignedSpecEdHours,
      totalAssigned: assignedSchoolHours + assignedSpecEdHours,
      psychologists
    };
  });
  res.json(summary);
});

module.exports = router;
