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

  // Validate: no member in more than one team of the same type
  if (req.body.memberDisplayNames !== undefined) {
    const teamType   = team.type;
    const typeLabel  = teamType === 'educational' ? 'חינוכי' : 'קליני';
    const otherTeams = db.get(col).value().filter(t => t.type === teamType && t.id !== id);
    const takenNames = new Set(
      otherTeams.flatMap(t => [t.headDisplayName, ...(t.memberDisplayNames || [])])
    );
    const duplicates = req.body.memberDisplayNames.filter(n => takenNames.has(n));
    if (duplicates.length > 0) {
      return res.status(400).json({
        error: `האנשים הבאים כבר משובצים לצוות ${typeLabel} אחר: ${duplicates.join(', ')}`
      });
    }
  }

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
  const employees  = db.get(activeCol('employees')).value()
    .filter(e => e.status === 'active' || !e.status);
  const teams      = db.get(activeCol('teams')).value();
  const exemptions = db.get('settings').get('exemptions').value() || [];
  const edExemptIds = new Set(exemptions.filter(x => x.type === 'teamEd').map(x => x.empId));
  const clExemptIds = new Set(exemptions.filter(x => x.type === 'teamClin').map(x => x.empId));

  const allEdMembers = new Set();
  const allClMembers = new Set();

  teams.forEach(t => {
    const target = t.type === 'educational' ? allEdMembers : allClMembers;
    [t.headDisplayName, ...(t.memberDisplayNames || [])].forEach(n => target.add(n));
  });

  const notInEducational = employees.filter(e => !allEdMembers.has(e.displayName) && !edExemptIds.has(e.id));
  const notInClinical    = employees.filter(e => !allClMembers.has(e.displayName) && !clExemptIds.has(e.id));

  res.json({ notInEducational, notInClinical, exemptions });
});

module.exports = router;
