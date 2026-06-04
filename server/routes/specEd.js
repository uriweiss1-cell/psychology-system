const express = require('express');
const router  = express.Router();
const { db, activeCol } = require('../database');
const { syncSpecEdAssignments, advanceAllGrades } = require('../utils/specEdSync');

router.get('/', (req, res) => {
  res.json(db.get(activeCol('specEdClasses')).value());
});

router.post('/', (req, res) => {
  const col    = activeCol('specEdClasses');
  const nextId = db.get('_nextId.specEdClasses').value();
  const entry  = {
    id: nextId,
    frameworkId:      +req.body.frameworkId || 0,
    grades:           req.body.grades || '',
    classType:        req.body.classType || 'ל.ל',
    psychologistName: req.body.psychologistName || '',
  };
  db.get(col).push(entry).write();
  db.set('_nextId.specEdClasses', nextId + 1).write();
  syncSpecEdAssignments(db, activeCol, entry.frameworkId);
  res.json(db.get(col).find({ id: nextId }).value());
});

router.put('/:id', (req, res) => {
  const col   = activeCol('specEdClasses');
  const id    = +req.params.id;
  const entry = db.get(col).find({ id }).value();
  if (!entry) return res.status(404).json({ error: 'לא נמצא' });
  const allowed = ['frameworkId', 'grades', 'classType', 'psychologistName'];
  const update  = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
  db.get(col).find({ id }).assign(update).write();
  const updated = db.get(col).find({ id }).value();
  syncSpecEdAssignments(db, activeCol, updated.frameworkId);
  res.json(db.get(col).find({ id }).value());
});

router.delete('/:id', (req, res) => {
  const col   = activeCol('specEdClasses');
  const entry = db.get(col).find({ id: +req.params.id }).value();
  if (!entry) return res.status(404).json({ ok: true });
  const frameworkId = entry.frameworkId;
  db.get(col).remove({ id: +req.params.id }).write();
  syncSpecEdAssignments(db, activeCol, frameworkId);
  res.json({ ok: true });
});

// Advance all spec-ed grades by one year
router.post('/advance-year', (req, res) => {
  const count = advanceAllGrades(db, activeCol);
  res.json({ ok: true, affectedFrameworks: count });
});

module.exports = router;
