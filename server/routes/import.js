const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { db, activeCol } = require('../database');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Parse xlsx buffer → array of row objects
function parseXlsx(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

// Build display name: first name + first letter of last name (e.g. "אור ה.")
function buildDisplayName(firstName, lastName) {
  if (!lastName) return firstName;
  return `${firstName} ${lastName[0]}.`;
}

// Preview import for employees (Standards)
router.post('/employees/preview', upload.single('file'), (req, res) => {
  try {
    const rows = parseXlsx(req.file.buffer);
    const existing = db.get(activeCol('employees')).value();
    const matchedIds = new Set();

    const preview = rows.map(row => {
      const firstName = String(row['שם פרטי']  || '').trim();
      const lastName  = String(row['שם משפחה'] || '').trim();
      if (!firstName) return null;

      const fteRaw     = row['אחוזי משרה'] ?? row['אחוז משרה'] ?? row['משרה'];
      const ftePercent = (fteRaw !== '' && fteRaw != null) ? parseFloat(fteRaw) : null;
      const matRaw     = row['חלד/חלת'] ?? row['חל"ד'] ?? row['חלד'] ?? '';
      const onMaternity  = !!(matRaw !== '' && +matRaw);
      const subRaw     = row['מילוי מקום חל"ד/חל"ת'] ?? row['מילוי מקום'] ?? '';
      const isSubstitute = !!(subRaw !== '' && +subRaw);

      const hasActivity = (ftePercent && ftePercent > 0 && !isNaN(ftePercent)) || onMaternity || isSubstitute;

      const firstWord = firstName.split(' ')[0];
      const existing_ = existing.find(e => e.firstName === firstName && e.lastName === lastName)
                     || existing.find(e => e.displayName === firstName)
                     || existing.find(e => e.firstName === firstWord && e.lastName === lastName)
                     || existing.find(e => e.firstName === firstWord && !e.lastName);
      if (existing_) matchedIds.add(existing_.id);

      const displayName = existing_?.displayName || buildDisplayName(firstName, lastName);

      if (!hasActivity) {
        return { displayName, firstName, lastName, action: 'remove', existingId: existing_?.id };
      }

      return {
        displayName, firstName, lastName,
        ftePercent: ftePercent && !isNaN(ftePercent) ? ftePercent : null,
        onMaternity, isSubstitute,
        action: existing_ ? 'update' : 'create',
        existingId: existing_?.id,
      };
    }).filter(Boolean);

    // IDs of employees not in Excel at all (will be deleted on apply)
    const toDeleteIds = existing.filter(e => !matchedIds.has(e.id)).map(e => e.id);

    res.json({ rows: preview, toDeleteIds });
  } catch (e) {
    res.status(400).json({ error: 'שגיאה בקריאת הקובץ: ' + e.message });
  }
});

router.post('/employees/apply', (req, res) => {
  const { rows, toDeleteIds = [] } = req.body;
  let created = 0, updated = 0, removed = 0, deleted = 0;

  rows.forEach(row => {
    if (row.action === 'create') {
      const nextId = db.get('_nextId.employees').value();
      db.get(activeCol('employees')).push({
        id: nextId, displayName: row.displayName, firstName: row.firstName || '',
        lastName: row.lastName || '', ftePercent: row.ftePercent || 1.0,
        type: 'expert', status: row.onMaternity ? 'maternity' : 'active',
        isSubstitute: row.isSubstitute || false,
        meetingHours: 0, supReceivedHours: 0, supGivenHours: 0,
        therapyHours: 0, roleHours: 0, roleName: '', officeHours: 0, notes: ''
      }).write();
      db.set('_nextId.employees', nextId + 1).write();
      created++;
    } else if (row.action === 'update' && row.existingId) {
      const update = {
        isSubstitute: row.isSubstitute || false,
        status: row.onMaternity ? 'maternity' : 'active',
      };
      if (row.ftePercent && row.ftePercent > 0) update.ftePercent = row.ftePercent;
      db.get(activeCol('employees')).find({ id: row.existingId }).assign(update).write();
      updated++;
    } else if (row.action === 'remove' && row.existingId) {
      db.get(activeCol('employees')).find({ id: row.existingId }).assign({ status: 'inactive' }).write();
      removed++;
    }
  });

  // Delete employees not in Excel at all
  toDeleteIds.forEach(id => {
    db.get(activeCol('employees')).remove({ id }).write();
    deleted++;
  });

  res.json({ ok: true, created, updated, removed, deleted });
});

// Preview import for kinder assignments
router.post('/kinder/preview', upload.single('file'), (req, res) => {
  try {
    const rows = parseXlsx(req.file.buffer);
    const employees = db.get(activeCol('employees')).value();
    const preview = rows.map(row => {
      const empName = String(row['פסיכולוג'] || row['שם פסיכולוג'] || '').trim();
      const emp = employees.find(e => e.displayName === empName);
      return {
        gardenName: String(row['שם גן'] || row['גן'] || '').trim(),
        ageGroup: String(row['גיל'] || row['קבוצת גיל'] || 'חובה').trim(),
        address: String(row['כתובת'] || '').trim(),
        phone: String(row['טלפון'] || '').trim(),
        teacher: String(row['גננת'] || '').trim(),
        teacherPhone: String(row['נייד גננת'] || '').trim(),
        email: String(row['מייל'] || '').trim(),
        psychologistName: empName,
        employeeId: emp?.id || null,
        found: !!emp,
      };
    }).filter(r => r.gardenName);
    res.json({ rows: preview });
  } catch (e) {
    res.status(400).json({ error: 'שגיאה בקריאת הקובץ: ' + e.message });
  }
});

router.post('/kinder/apply', (req, res) => {
  const { rows } = req.body;
  const col = activeCol('kinderAssignments');
  let created = 0;
  rows.forEach(row => {
    if (!row.employeeId) return;
    const nextId = db.get('_nextId.kinderAssignments').value();
    db.get(col).push({
      id: nextId, employeeId: row.employeeId,
      gardenName: row.gardenName, ageGroup: row.ageGroup,
      address: row.address, phone: row.phone,
      teacher: row.teacher, teacherPhone: row.teacherPhone, email: row.email
    }).write();
    db.set('_nextId.kinderAssignments', nextId + 1).write();
    created++;
  });
  res.json({ ok: true, created });
});

module.exports = router;
