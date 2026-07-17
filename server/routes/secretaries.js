const express = require('express');
const router = express.Router();
const { db, activeCol } = require('../database');

const col = () => activeCol('secretaries');

router.get('/', (req, res) => {
  res.json(db.get(col()).value() || []);
});

router.post('/', (req, res) => {
  const all = db.get(col()).value() || [];
  const id = all.length ? Math.max(...all.map(s => s.id)) + 1 : 1;
  const sec = { id, name: req.body.name || '', ftePercent: req.body.ftePercent || 1 };
  db.get(col()).push(sec).write();
  res.json(sec);
});

router.put('/:id', (req, res) => {
  const id = +req.params.id;
  const allowed = ['name', 'ftePercent'];
  const update = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
  db.get(col()).find({ id }).assign(update).write();
  res.json(db.get(col()).find({ id }).value());
});

router.delete('/:id', (req, res) => {
  const id = +req.params.id;
  db.get(col()).remove({ id }).write();
  res.json({ ok: true });
});

module.exports = router;
