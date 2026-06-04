const express = require('express');
const router = express.Router();
const { db } = require('../database');

router.get('/', (req, res) => {
  res.json(db.get('settings').value());
});

router.put('/', (req, res) => {
  const allowed = ['approvedPositions'];
  const update = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });
  db.get('settings').assign(update).write();
  res.json(db.get('settings').value());
});

module.exports = router;
