const express = require('express');
const router = express.Router();
const { db, activeCol } = require('../database');

const col = () => activeCol('interestGroups');

router.get('/', (req, res) => {
  res.json(db.get(col()).value() || []);
});

router.post('/', (req, res) => {
  const all = db.get(col()).value() || [];
  const id = all.length ? Math.max(...all.map(g => g.id)) + 1 : 1;
  const group = {
    id,
    name: req.body.name || '',
    facilitatorNames: req.body.facilitatorNames || [],
    memberDisplayNames: req.body.memberDisplayNames || [],
  };
  db.get(col()).push(group).write();
  res.json(group);
});

router.put('/:id', (req, res) => {
  const id = +req.params.id;
  const allowed = ['name', 'facilitatorNames', 'memberDisplayNames'];
  const update = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
  db.get(col()).find({ id }).assign(update).write();
  res.json(db.get(col()).find({ id }).value());
});

router.delete('/:id', (req, res) => {
  db.get(col()).remove({ id: +req.params.id }).write();
  res.json({ ok: true });
});

module.exports = router;
