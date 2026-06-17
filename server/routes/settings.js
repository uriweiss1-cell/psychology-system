const express = require('express');
const router = express.Router();
const { db, activeCol } = require('../database');

function settingsCol() {
  if (db.get('draftActive').value()) {
    const draft = db.get('draft_settings').value();
    if (draft) return 'draft_settings';
  }
  return 'settings';
}

router.get('/', (req, res) => {
  res.json(db.get(settingsCol()).value());
});

router.put('/', (req, res) => {
  const col = settingsCol();
  const allowed = ['approvedPositions', 'freeHoursTargets'];
  const update = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
  db.get(col).assign(update).write();
  res.json(db.get(col).value());
});

router.get('/marks', (req, res) => {
  res.json(db.get('settings').get('standardsMarked').value() || []);
});

router.put('/marks', (req, res) => {
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  db.get('settings').assign({ standardsMarked: ids }).write();
  res.json(ids);
});

module.exports = router;
