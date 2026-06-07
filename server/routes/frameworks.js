const express = require('express');
const router = express.Router();
const { db } = require('../database');

router.get('/', (req, res) => {
  res.json(db.get('frameworks').value());
});

router.post('/', (req, res) => {
  const nextId = db.get('_nextId.frameworks').value();
  const fw = {
    id: nextId,
    name: req.body.name || '',
    type: req.body.type || 'school',
    sector: req.body.sector || 'ממלכתי',
    subType: req.body.subType || '',
    allocatedHours: req.body.allocatedHours || null,
    studentCount: req.body.studentCount || null,
    notes: req.body.notes || ''
  };
  db.get('frameworks').push(fw).write();
  db.set('_nextId.frameworks', nextId + 1).write();
  res.json(fw);
});

router.put('/:id', (req, res) => {
  const id = +req.params.id;
  const fw = db.get('frameworks').find({ id }).value();
  if (!fw) return res.status(404).json({ error: 'לא נמצא' });
  const allowed = ['name','type','sector','subType','allocatedHours','studentCount','notes','targetHours'];
  const update = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
  db.get('frameworks').find({ id }).assign(update).write();
  res.json(db.get('frameworks').find({ id }).value());
});

router.delete('/:id', (req, res) => {
  const id = +req.params.id;
  db.get('frameworks').remove({ id }).write();
  res.json({ ok: true });
});

module.exports = router;
