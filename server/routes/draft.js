const express = require('express');
const router = express.Router();
const { db } = require('../database');

router.get('/status', (req, res) => {
  res.json({ active: db.get('draftActive').value() });
});

router.post('/activate', (req, res) => {
  if (db.get('draftActive').value()) return res.json({ ok: true, already: true });
  // Copy current data to draft
  db.set('draft_assignments', JSON.parse(JSON.stringify(db.get('assignments').value()))).write();
  db.set('draft_kinderAssignments', JSON.parse(JSON.stringify(db.get('kinderAssignments').value()))).write();
  db.set('draft_specEdClasses', JSON.parse(JSON.stringify(db.get('specEdClasses').value()))).write();
  db.set('draftActive', true).write();
  res.json({ ok: true });
});

router.post('/approve', (req, res) => {
  if (!db.get('draftActive').value()) return res.status(400).json({ error: 'אין טיוטה פעילה' });
  // Copy draft → current
  db.set('assignments', JSON.parse(JSON.stringify(db.get('draft_assignments').value()))).write();
  db.set('kinderAssignments', JSON.parse(JSON.stringify(db.get('draft_kinderAssignments').value()))).write();
  db.set('specEdClasses', JSON.parse(JSON.stringify(db.get('draft_specEdClasses').value()))).write();
  // Clear draft
  db.set('draft_assignments', []).write();
  db.set('draft_kinderAssignments', []).write();
  db.set('draft_specEdClasses', []).write();
  db.set('draftActive', false).write();
  res.json({ ok: true });
});

router.post('/discard', (req, res) => {
  db.set('draft_assignments', []).write();
  db.set('draft_kinderAssignments', []).write();
  db.set('draft_specEdClasses', []).write();
  db.set('draftActive', false).write();
  res.json({ ok: true });
});

module.exports = router;
