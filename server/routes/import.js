const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const { db, activeCol } = require('../database');
const { recalcDisplayNames } = require('../utils/displayName');

function removeFromTeamsAndSupervisions(displayName) {
  const teamsCol = activeCol('teams');
  const supCol   = activeCol('supervisions');
  db.get(teamsCol).value().forEach(team => {
    if (team.headDisplayName === displayName) {
      db.get(teamsCol).remove({ id: team.id }).write();
    } else {
      const filtered = (team.memberDisplayNames || []).filter(n => n !== displayName);
      if (filtered.length !== (team.memberDisplayNames || []).length)
        db.get(teamsCol).find({ id: team.id }).assign({ memberDisplayNames: filtered }).write();
    }
  });
  db.get(supCol).value().forEach(sup => {
    if (sup.supervisorName === displayName) { db.get(supCol).remove({ id: sup.id }).write(); return; }
    const filtered = (sup.superviseeNames || []).filter(n => n !== displayName);
    if (filtered.length !== (sup.superviseeNames || []).length) {
      if (filtered.length === 0) db.get(supCol).remove({ id: sup.id }).write();
      else db.get(supCol).find({ id: sup.id }).assign({ superviseeNames: filtered }).write();
    }
  });
}

function clearKinderAssignments(employeeId) {
  db.get(activeCol('kinderAssignments')).filter({ employeeId }).value()
    .forEach(a => db.get(activeCol('kinderAssignments')).find({ id: a.id }).assign({ employeeId: 0 }).write());
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Parse xlsx buffer → array of row objects
// Searches all sheets and all rows for the header row (handles title rows above headers)
function parseXlsx(buffer) {
  const KINDER_KEYS = ['גן', 'פסיכולוג', 'גיל', 'גננת', 'כתובת', 'טלפון', 'מייל'];
  const wb = XLSX.read(buffer, { type: 'buffer' });
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (ws['!type'] && ws['!type'] !== 'sheet') continue; // skip charts
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (!raw.length) continue;
    // Try each row as a potential header row
    for (let hi = 0; hi < Math.min(raw.length, 10); hi++) {
      const headerRow = raw[hi].map(c => String(c).trim());
      const hasKinderCol = headerRow.some(h => KINDER_KEYS.some(k => h.includes(k)));
      if (!hasKinderCol) continue;
      // Build objects using this row as headers
      const result = [];
      for (let ri = hi + 1; ri < raw.length; ri++) {
        const obj = {};
        headerRow.forEach((h, ci) => { if (h) obj[h] = String(raw[ri][ci] ?? '').trim(); });
        result.push(obj);
      }
      if (result.length > 0) return result;
    }
    // Fallback: standard parse
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    if (rows.length > 0) return rows;
  }
  return [];
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
        meetingHours: 4, supReceivedHours: 0, supGivenHours: 0,
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
      if (update.status === 'maternity' || update.status === 'inactive') {
        clearKinderAssignments(row.existingId);
        const emp = db.get(activeCol('employees')).find({ id: row.existingId }).value();
        if (emp) removeFromTeamsAndSupervisions(emp.displayName);
      }
      updated++;
    } else if (row.action === 'remove' && row.existingId) {
      const emp = db.get(activeCol('employees')).find({ id: row.existingId }).value();
      db.get(activeCol('employees')).find({ id: row.existingId }).assign({ status: 'inactive' }).write();
      clearKinderAssignments(row.existingId);
      if (emp) removeFromTeamsAndSupervisions(emp.displayName);
      removed++;
    }
  });

  // Delete employees not in Excel at all — remove from teams/supervisions too
  toDeleteIds.forEach(id => {
    const emp = db.get(activeCol('employees')).find({ id }).value();
    if (emp) removeFromTeamsAndSupervisions(emp.displayName);
    db.get(activeCol('employees')).remove({ id }).write();
    deleted++;
  });

  // Recalc displayNames for all affected firstNames
  const affectedFirstNames = [...new Set(rows.map(r => r.firstName).filter(Boolean))];
  affectedFirstNames.forEach(fn => recalcDisplayNames(db, activeCol('employees'), fn));

  res.json({ ok: true, created, updated, removed, deleted });
});

// Preview import for kinder assignments
router.post('/kinder/preview', upload.single('file'), (req, res) => {
  try {
    const buf = req.file.buffer;
    console.log('[kinder/preview] buffer size:', buf.length, 'mimetype:', req.file.mimetype, 'originalname:', req.file.originalname);
    const wb = require('xlsx').read(buf, { type: 'buffer' });
    console.log('[kinder/preview] sheets:', wb.SheetNames);
    wb.SheetNames.forEach(name => {
      const raw = require('xlsx').utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' });
      console.log(`[kinder/preview] sheet "${name}": ${raw.length} rows, first row:`, JSON.stringify(raw[0]));
    });
    const rows = parseXlsx(req.file.buffer);
    const employees = db.get(activeCol('employees')).value();
    const detectedColumns = rows.length > 0 ? Object.keys(rows[0]) : [];
    const preview = rows.map(row => {
      const empName = String(row['שם הפסיכולוגית'] || row['פסיכולוג'] || row['שם פסיכולוג'] || '').trim();
      const gardenName = String(row['שם הגן'] || row['שם גן'] || row['גן'] || '').trim();
      if (!gardenName) return null;
      const emp = employees.find(e => e.displayName === empName);
      const ageGroup = String(row['גיל'] || row['קבוצת גיל'] || 'חובה').trim();
      const address = String(row['כתובת'] || '').trim();
      const phone = String(row['טלפון בגן'] || row['טלפון'] || '').trim();
      const sector = String(row['סקטור'] || '').trim();
      const teacher = String(row['גננת'] || '').trim();
      const teacherPhone = String(row['נייד'] || row['נייד גננת'] || '').trim();
      const email = String(row['מייל'] || '').trim();
      return {
        'שם גן': gardenName,
        'גיל': ageGroup,
        'כתובת': address,
        'טלפון': phone,
        'סקטור': sector,
        'גננת': teacher,
        'נייד': teacherPhone,
        'מייל': email,
        'פסיכולוג': empName,
        'נמצא': emp ? '✓' : empName ? '✗' : '—',
        // internal fields for apply
        gardenName, ageGroup, address, phone, sector, teacher, teacherPhone, email,
        psychologistName: empName,
        employeeId: emp?.id || 0,
        found: !!emp,
      };
    }).filter(Boolean);
    res.json({ rows: preview, detectedColumns });
  } catch (e) {
    res.status(400).json({ error: 'שגיאה בקריאת הקובץ: ' + e.message });
  }
});

router.post('/kinder/apply', (req, res) => {
  try {
    const { rows } = req.body;
    const col = activeCol('kinderAssignments');
    let nextId = db.get('_nextId.kinderAssignments').value() || 1;
    const newList = rows.map(row => ({
      id: nextId++,
      employeeId: row.employeeId || 0,
      gardenName: row.gardenName || row['שם גן'] || '',
      ageGroup: row.ageGroup || row['גיל'] || '',
      address: row.address || row['כתובת'] || '',
      phone: row.phone || row['טלפון'] || row['טלפון בגן'] || '',
      sector: row.sector || row['סקטור'] || '',
      teacher: row.teacher || row['גננת'] || '',
      teacherPhone: row.teacherPhone || row['נייד'] || '',
      email: row.email || row['מייל'] || '',
    }));
    db.set(col, newList).write();
    db.set('_nextId.kinderAssignments', nextId).write();
    res.json({ ok: true, created: newList.length });
  } catch (e) {
    console.error('[kinder/apply] error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
