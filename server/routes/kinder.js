const express = require('express');
const router = express.Router();
const { db, activeCol } = require('../database');

router.get('/', (req, res) => {
  const col = activeCol('kinderAssignments');
  const assignments = db.get(col).value();
  const employees = db.get(activeCol('employees')).value();
  const enriched = assignments.map(a => {
    const emp = employees.find(e => e.id === a.employeeId);
    return { ...a, employeeName: emp?.displayName || '?' };
  });
  res.json(enriched);
});

router.post('/', (req, res) => {
  const col = activeCol('kinderAssignments');
  const nextId = db.get('_nextId.kinderAssignments').value();
  const a = {
    id: nextId,
    employeeId: req.body.employeeId,
    gardenName: req.body.gardenName || '',
    ageGroup: req.body.ageGroup || 'חובה',
    address: req.body.address || '',
    phone: req.body.phone || '',
    teacher: req.body.teacher || '',
    teacherPhone: req.body.teacherPhone || '',
    email: req.body.email || ''
  };
  db.get(col).push(a).write();
  db.set('_nextId.kinderAssignments', nextId + 1).write();
  const emp = db.get(activeCol('employees')).find({ id: a.employeeId }).value();
  res.json({ ...a, employeeName: emp?.displayName || '?' });
});

router.put('/:id', (req, res) => {
  const col = activeCol('kinderAssignments');
  const id = +req.params.id;
  const a = db.get(col).find({ id }).value();
  if (!a) return res.status(404).json({ error: 'לא נמצא' });
  const allowed = ['employeeId','gardenName','ageGroup','address','phone','teacher','teacherPhone','email'];
  const update = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
  db.get(col).find({ id }).assign(update).write();
  const updated = db.get(col).find({ id }).value();
  const emp = db.get(activeCol('employees')).find({ id: updated.employeeId }).value();
  res.json({ ...updated, employeeName: emp?.displayName || '?' });
});

router.delete('/:id', (req, res) => {
  const col = activeCol('kinderAssignments');
  db.get(col).remove({ id: +req.params.id }).write();
  res.json({ ok: true });
});

module.exports = router;
