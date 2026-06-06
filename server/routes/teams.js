const express = require('express');
const router = express.Router();
const { db, activeCol } = require('../database');

router.get('/', (req, res) => {
  res.json(db.get(activeCol('teams')).value());
});

router.put('/:id', (req, res) => {
  const col = activeCol('teams');
  const id  = +req.params.id;
  const team = db.get(col).find({ id }).value();
  if (!team) return res.status(404).json({ error: 'לא נמצא' });
  const allowed = ['headDisplayName','memberDisplayNames','externalMembers'];
  const update = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
  db.get(col).find({ id }).assign(update).write();
  res.json(db.get(col).find({ id }).value());
});

// Which employees are not assigned to any educational team
router.post('/', (req, res) => {
  const col = activeCol('teams');
  const teams = db.get(col).value();
  const nextId = (db.get('_nextId').value() || {}).teams || (Math.max(0, ...teams.map(t => t.id)) + 1);
  const id = nextId;
  db.get('_nextId').assign({ teams: id + 1 }).write();
  const team = {
    id,
    type: req.body.type || 'clinical',
    headDisplayName: req.body.headDisplayName || '',
    memberDisplayNames: req.body.memberDisplayNames || [],
    externalMembers: req.body.externalMembers || [],
  };
  db.get(col).push(team).write();
  res.json(team);
});

router.delete('/:id', (req, res) => {
  const col = activeCol('teams');
  const id  = +req.params.id;
  const team = db.get(col).find({ id }).value();
  if (!team) return res.status(404).json({ error: 'לא נמצא' });
  db.get(col).remove({ id }).write();
  res.json({ ok: true });
});

router.get('/unassigned', (req, res) => {
  const employees = db.get(activeCol('employees')).value()
    .filter(e => e.status === 'active' || !e.status);
  const teams     = db.get(activeCol('teams')).value();

  const allEdMembers = new Set();
  const allClMembers = new Set();

  teams.forEach(t => {
    const target = t.type === 'educational' ? allEdMembers : allClMembers;
    [t.headDisplayName, ...(t.memberDisplayNames || [])].forEach(n => target.add(n));
  });

  const notInEducational = employees.filter(e => !allEdMembers.has(e.displayName));
  const notInClinical    = employees.filter(e => !allClMembers.has(e.displayName));

  res.json({ notInEducational, notInClinical });
});

module.exports = router;
