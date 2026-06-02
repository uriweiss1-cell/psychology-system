const express = require('express');
const router = express.Router();
const { db } = require('../database');

router.get('/', (req, res) => {
  res.json(db.get('teams').value());
});

router.put('/:id', (req, res) => {
  const id = +req.params.id;
  const team = db.get('teams').find({ id }).value();
  if (!team) return res.status(404).json({ error: 'לא נמצא' });
  const allowed = ['headDisplayName','memberDisplayNames','externalMembers'];
  const update = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
  db.get('teams').find({ id }).assign(update).write();
  res.json(db.get('teams').find({ id }).value());
});

// Which employees are not assigned to any educational team
router.get('/unassigned', (req, res) => {
  const employees = db.get('employees').value();
  const teams = db.get('teams').value();

  const allEdMembers = new Set();
  const allClMembers = new Set();

  teams.forEach(t => {
    const target = t.type === 'educational' ? allEdMembers : allClMembers;
    [t.headDisplayName, ...(t.memberDisplayNames || [])].forEach(n => target.add(n));
  });

  const notInEducational = employees.filter(e => !allEdMembers.has(e.displayName));
  const notInClinical = employees.filter(e => !allClMembers.has(e.displayName));

  res.json({ notInEducational, notInClinical });
});

module.exports = router;
