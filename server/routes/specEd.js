const express = require('express');
const router = express.Router();
const { db, activeCol } = require('../database');

router.get('/', (req, res) => {
  res.json(db.get(activeCol('specEdClasses')).value());
});

router.post('/', (req, res) => {
  const col = activeCol('specEdClasses');
  const nextId = db.get('_nextId.specEdClasses').value();
  const entry = {
    id: nextId,
    frameworkId: +req.body.frameworkId || 0,
    grades: req.body.grades || '',
    classType: req.body.classType || 'ל.ל',
    psychologistName: req.body.psychologistName || '',
  };
  db.get(col).push(entry).write();
  db.set('_nextId.specEdClasses', nextId + 1).write();
  res.json(entry);
});

router.put('/:id', (req, res) => {
  const col = activeCol('specEdClasses');
  const id = +req.params.id;
  const entry = db.get(col).find({ id }).value();
  if (!entry) return res.status(404).json({ error: 'לא נמצא' });
  const allowed = ['frameworkId', 'grades', 'classType', 'psychologistName'];
  const update = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
  db.get(col).find({ id }).assign(update).write();
  res.json(db.get(col).find({ id }).value());
});

router.delete('/:id', (req, res) => {
  const col = activeCol('specEdClasses');
  db.get(col).remove({ id: +req.params.id }).write();
  res.json({ ok: true });
});

module.exports = router;
