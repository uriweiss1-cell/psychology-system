const express = require('express');
const router  = express.Router();
const { db, activeCol } = require('../database');

const INDIVIDUAL_TYPES = ['educational', 'clinical'];
const INDIVIDUAL_LABELS = { educational: 'חינוכית', clinical: 'קלינית' };

// Check if any of the given superviseeNames already appear in another
// individual supervision of the same type (excluding current id)
function checkDuplicateSupervisees(col, type, superviseeNames, excludeId) {
  if (!INDIVIDUAL_TYPES.includes(type)) return [];
  const existing = db.get(col).value()
    .filter(s => s.type === type && s.id !== excludeId);
  const taken = new Set(existing.flatMap(s => s.superviseeNames || []));
  return superviseeNames.filter(n => taken.has(n));
}

router.get('/', (req, res) => {
  res.json(db.get(activeCol('supervisions')).value());
});

router.post('/', (req, res) => {
  const col    = activeCol('supervisions');
  const type   = req.body.type || 'educational';
  const superviseeNames = req.body.superviseeNames || [];

  const duplicates = checkDuplicateSupervisees(col, type, superviseeNames, -1);
  if (duplicates.length > 0) {
    return res.status(400).json({
      error: `המודרכים הבאים כבר רשומים בהדרכה ${INDIVIDUAL_LABELS[type]} פרטנית: ${duplicates.join(', ')}`
    });
  }

  const nextId = db.get('_nextId.supervisions').value();
  const s = {
    id:              nextId,
    type,
    customLabel:     req.body.customLabel     || '',
    supervisorName:  req.body.supervisorName  || '',
    superviseeNames,
    hoursPerSession: req.body.hoursPerSession || 1,
    isExternal:      req.body.isExternal      || false,
    notes:           req.body.notes           || '',
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

  const type           = req.body.type !== undefined ? req.body.type : s.type;
  const superviseeNames = req.body.superviseeNames !== undefined ? req.body.superviseeNames : s.superviseeNames;

  if (req.body.superviseeNames !== undefined) {
    const duplicates = checkDuplicateSupervisees(col, type, superviseeNames, id);
    if (duplicates.length > 0) {
      return res.status(400).json({
        error: `המודרכים הבאים כבר רשומים בהדרכה ${INDIVIDUAL_LABELS[type] || ''} פרטנית: ${duplicates.join(', ')}`
      });
    }
  }

  const allowed = ['type','customLabel','supervisorName','superviseeNames','hoursPerSession','isExternal','notes'];
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
