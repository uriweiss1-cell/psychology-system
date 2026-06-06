const express = require('express');
const router  = express.Router();
const { db, activeCol } = require('../database');

router.get('/', (req, res) => {
  res.json(db.get(activeCol('supervisions')).value());
});

router.post('/', (req, res) => {
  const col    = activeCol('supervisions');
  const nextId = db.get('_nextId.supervisions').value();
  const s = {
    id: nextId,
    type:            req.body.type            || 'educational',
    supervisorName:  req.body.supervisorName  || '',
    superviseeNames: req.body.superviseeNames || [],
    hoursPerSession: req.body.hoursPerSession || 1,
    isExternal:      req.body.isExternal      || false,
    notes:           req.body.notes           || ''
  };
  db.get(col).push(s).write();
  db.set('_nextId.supervisions', nextId + 1).write();
  res.json(s);
});

router.put('/:id', (req, res) => {
  const col = activeCol('supervisions');
  const id  = +req.params.id;
  const s   = db.get(col).find({ id }).value();
  if (!s) return res.status(404).json({ error: 'לא נמצא' });
  const allowed = ['type','supervisorName','superviseeNames','hoursPerSession','isExternal','notes'];
  const update  = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
  db.get(col).find({ id }).assign(update).write();
  res.json(db.get(col).find({ id }).value());
});

router.delete('/:id', (req, res) => {
  db.get(activeCol('supervisions')).remove({ id: +req.params.id }).write();
  res.json({ ok: true });
});

module.exports = router;
