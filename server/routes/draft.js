const express = require('express');
const router = express.Router();
const { db } = require('../database');

const DRAFT_COLS = ['employees', 'assignments', 'kinderAssignments', 'specEdClasses', 'teams', 'supervisions', 'frameworks'];
const DRAFT_OBJECTS = ['settings']; // object collections (not arrays)

function copyToDraft() {
  DRAFT_COLS.forEach(col => {
    db.set(`draft_${col}`, JSON.parse(JSON.stringify(db.get(col).value()))).write();
  });
  DRAFT_OBJECTS.forEach(col => {
    const copy = JSON.parse(JSON.stringify(db.get(col).value()));
    copy.standardsMarked = [];
    db.set(`draft_${col}`, copy).write();
  });
}

function copyFromDraft() {
  DRAFT_COLS.forEach(col => {
    db.set(col, JSON.parse(JSON.stringify(db.get(`draft_${col}`).value()))).write();
  });
  DRAFT_OBJECTS.forEach(col => {
    const liveMarked = db.get(col).get('standardsMarked').value();
    db.set(col, JSON.parse(JSON.stringify(db.get(`draft_${col}`).value()))).write();
    // standardsMarked is mode-specific — restore live value after overwrite
    if (liveMarked !== undefined) {
      db.get(col).assign({ standardsMarked: liveMarked }).write();
    }
  });
}

function clearDraft() {
  DRAFT_COLS.forEach(col => db.set(`draft_${col}`, []).write());
  DRAFT_OBJECTS.forEach(col => db.set(`draft_${col}`, null).write());
}

router.get('/status', (req, res) => {
  res.json({
    active:     db.get('draftActive').value(),
    hasSaved:   db.get('draftSaved').value() || false,
  });
});

function ensureDraftComplete() {
  DRAFT_COLS.forEach(col => {
    const val = db.get(`draft_${col}`).value();
    if (!val || !val.length) {
      db.set(`draft_${col}`, JSON.parse(JSON.stringify(db.get(col).value()))).write();
    }
  });
  DRAFT_OBJECTS.forEach(col => {
    const val = db.get(`draft_${col}`).value();
    if (!val) {
      db.set(`draft_${col}`, JSON.parse(JSON.stringify(db.get(col).value()))).write();
    }
  });
}

// Open future planning — if saved draft exists, resume it; otherwise create fresh copy
router.post('/activate', (req, res) => {
  if (db.get('draftActive').value()) return res.json({ ok: true, already: true });
  if (!db.get('draftSaved').value()) {
    copyToDraft();
    db.set('draftSaved', true).write();
  } else {
    ensureDraftComplete(); // fill any missing collections (e.g. frameworks added after draft was created)
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
  ensureDraftComplete();
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
