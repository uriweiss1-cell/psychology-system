const express = require('express');
const router = express.Router();
const { db } = require('../database');

const DRAFT_COLS = ['employees', 'assignments', 'kinderAssignments', 'specEdClasses', 'teams', 'supervisions'];

function copyToDraft() {
  DRAFT_COLS.forEach(col => {
    db.set(`draft_${col}`, JSON.parse(JSON.stringify(db.get(col).value()))).write();
  });
}

function copyFromDraft() {
  DRAFT_COLS.forEach(col => {
    db.set(col, JSON.parse(JSON.stringify(db.get(`draft_${col}`).value()))).write();
  });
}

function clearDraft() {
  DRAFT_COLS.forEach(col => db.set(`draft_${col}`, []).write());
}

router.get('/status', (req, res) => {
  res.json({
    active:     db.get('draftActive').value(),
    hasSaved:   db.get('draftSaved').value() || false,
  });
});

// Open future planning — if saved draft exists, resume it; otherwise create fresh copy
router.post('/activate', (req, res) => {
  if (db.get('draftActive').value()) return res.json({ ok: true, already: true });
  if (!db.get('draftSaved').value()) {
    copyToDraft();
    db.set('draftSaved', true).write();
  }
  db.set('draftActive', true).write();
  res.json({ ok: true });
});

// Pause — show current live data without discarding draft
router.post('/pause', (req, res) => {
  db.set('draftActive', false).write();
  res.json({ ok: true });
});

// Resume — go back to saved draft
router.post('/resume', (req, res) => {
  if (!db.get('draftSaved').value()) return res.status(400).json({ error: 'אין טיוטה שמורה' });
  db.set('draftActive', true).write();
  res.json({ ok: true });
});

// Approve — copy draft → live, clear draft
router.post('/approve', (req, res) => {
  if (!db.get('draftSaved').value()) return res.status(400).json({ error: 'אין טיוטה שמורה' });
  copyFromDraft();
  clearDraft();
  db.set('draftActive', false).write();
  db.set('draftSaved', false).write();
  res.json({ ok: true });
});

// Discard — clear draft
router.post('/discard', (req, res) => {
  clearDraft();
  db.set('draftActive', false).write();
  db.set('draftSaved', false).write();
  res.json({ ok: true });
});

module.exports = router;
