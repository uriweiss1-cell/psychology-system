const GRADE_ORDER = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י', 'יא', 'יב'];

// Frameworks where grades extend to יב even though subType is 'חטיבה'
const EXTENDED_FW_IDS = new Set([125, 129]); // אולפנת זבולון, עתיד (כנפי רוח)

function getMaxGrade(framework) {
  if (EXTENDED_FW_IDS.has(framework.id)) return 'יב';
  switch (framework.subType) {
    case 'יסודי':  return 'ו';
    case 'חטיבה':  return 'ט';
    case 'תיכון':  return 'יב';
    default:        return 'יב'; // special_ed or unknown – no limit
  }
}

// Count hours for a single token (e.g. 'א', 'ז1', 'ח*')
function tokenHours(raw) {
  const letter = raw.replace(/[\d*]/g, '').trim();
  if (!letter) return 0;
  return (letter === 'א' || letter === 'ז') ? 2 : 1;
}

// Calculate total spec-ed hours from a grades string
function calcGradeHours(gradesStr) {
  if (!gradesStr) return 0;
  let total = 0;
  gradesStr.split(',').forEach(part => {
    part.trim().split('+').forEach(tok => {
      total += tokenHours(tok.trim());
    });
  });
  return total;
}

// Advance a single grade token one year; return null if it exceeds maxGrade
function advanceToken(raw, maxIdx) {
  const suffix = raw.replace(/^[א-ת]+/, ''); // digits / asterisk suffix
  const letter = raw.replace(/[\d*]/g, '').trim();
  const idx = GRADE_ORDER.indexOf(letter);
  if (idx === -1) return raw; // unrecognised – keep
  if (idx >= maxIdx) return null; // at or past max – delete
  return GRADE_ORDER[idx + 1] + suffix;
}

// Advance a full grades string for a given framework
function advanceGradesStr(gradesStr, maxGrade) {
  if (!gradesStr) return '';
  const maxIdx = GRADE_ORDER.indexOf(maxGrade);
  const newTokens = [];

  gradesStr.split(',').forEach(raw => {
    const parts = raw.trim().split('+');
    const newParts = parts
      .map(p => advanceToken(p.trim(), maxIdx))
      .filter(Boolean); // remove parts that exceeded max
    if (newParts.length) newTokens.push(newParts.join('+'));
  });

  return newTokens.join(', ');
}

/**
 * Synchronise framework assignments with specEdClasses data.
 * - Primary psychologist (matches main assignment employee): update specEdHours,
 *   clear redundant psychologistName from their specEdClasses rows.
 * - Secondary psychologist (different): create/update a secondary assignment
 *   with the calculated specEdHours.
 * - Psychologists no longer present: remove their secondary assignment.
 */
function syncSpecEdAssignments(db, activeCol, frameworkId) {
  const asgnCol   = activeCol('assignments');
  const specCol   = activeCol('specEdClasses');
  const employees = db.get(activeCol('employees')).value();

  // All spec-ed classes for this framework
  const classes = db.get(specCol).filter({ frameworkId }).value();

  // Hours per named psychologist (handles 'name1 / name2' splits)
  const hoursByPsych = {};
  classes.forEach(cls => {
    const rawName = (cls.psychologistName || '').trim();
    if (!rawName) return;
    const hours = calcGradeHours(cls.grades);
    if (!hours) return;
    const names = rawName.split('/').map(n => n.trim()).filter(Boolean);
    const perName = Math.round((hours / names.length) * 2) / 2;
    names.forEach(n => { hoursByPsych[n] = (hoursByPsych[n] || 0) + perName; });
  });

  // Primary assignment for this framework
  const allAsgns    = db.get(asgnCol).value();
  const primaryAsgn = allAsgns.find(a => a.frameworkId === frameworkId && a.employeeId > 0);
  const primaryEmp  = primaryAsgn ? employees.find(e => e.id === primaryAsgn.employeeId) : null;
  const primaryName = primaryEmp?.displayName?.trim();

  // Track employee IDs that should have assignments (for cleanup)
  const keepEmpIds = new Set(primaryAsgn ? [primaryAsgn.employeeId] : []);

  Object.entries(hoursByPsych).forEach(([psychName, hours]) => {
    if (psychName === primaryName) {
      // Same as primary – update specEdHours and clear redundant names
      if (primaryAsgn) {
        db.get(asgnCol).find({ id: primaryAsgn.id }).assign({ specEdHours: hours }).write();
      }
      classes
        .filter(c => (c.psychologistName || '').split('/').map(n => n.trim()).includes(psychName))
        .forEach(c => {
          const remaining = (c.psychologistName || '')
            .split('/').map(n => n.trim()).filter(n => n && n !== psychName).join(' / ');
          db.get(specCol).find({ id: c.id }).assign({ psychologistName: remaining }).write();
        });
    } else {
      // Different psychologist – find employee by displayName
      const emp = employees.find(e => e.displayName?.trim() === psychName);
      if (!emp) return;
      keepEmpIds.add(emp.id);
      const existing = allAsgns.find(a => a.frameworkId === frameworkId && a.employeeId === emp.id);
      if (existing) {
        db.get(asgnCol).find({ id: existing.id }).assign({ specEdHours: hours }).write();
      } else {
        const ids = db.get(asgnCol).value().map(a => a.id);
        const nextId = ids.length ? Math.max(...ids) + 1 : 1;
        db.get(asgnCol).push({ id: nextId, employeeId: emp.id, frameworkId, hours: 0, specEdHours: hours, kinderHours: 0 }).write();
      }
    }
  });

  // Remove secondary assignments for psychologists no longer in specEdClasses
  db.get(asgnCol).value()
    .filter(a => a.frameworkId === frameworkId && a.employeeId > 0 && a.id !== primaryAsgn?.id)
    .forEach(a => {
      if (!keepEmpIds.has(a.employeeId)) {
        if ((a.hours || 0) > 0) {
          // Has regular school hours — keep assignment, just clear specEdHours
          db.get(asgnCol).find({ id: a.id }).assign({ specEdHours: 0 }).write();
        } else {
          db.get(asgnCol).remove({ id: a.id }).write();
        }
      }
    });

  // Clear all psychologistName fields — assignments table now tracks this
  db.get(specCol).filter({ frameworkId }).value().forEach(c => {
    if (c.psychologistName) {
      db.get(specCol).find({ id: c.id }).assign({ psychologistName: '' }).write();
    }
  });
}

/**
 * Advance all spec-ed classes by one year.
 * Deletes grades that exceed the framework's max grade.
 * Then re-syncs assignments for every affected framework.
 * Returns the number of affected frameworks.
 */
function advanceAllGrades(db, activeCol) {
  const specCol    = activeCol('specEdClasses');
  const frameworks = db.get(activeCol('frameworks')).value();
  const affected   = new Set();

  db.get(specCol).value().forEach(cls => {
    const fw = frameworks.find(f => f.id === cls.frameworkId);
    if (!fw) return;
    const maxGrade  = getMaxGrade(fw);
    const newGrades = advanceGradesStr(cls.grades, maxGrade);
    if (newGrades === cls.grades) return;

    affected.add(cls.frameworkId);
    if (!newGrades) {
      db.get(specCol).remove({ id: cls.id }).write();
    } else {
      db.get(specCol).find({ id: cls.id }).assign({ grades: newGrades }).write();
    }
  });

  affected.forEach(fwId => syncSpecEdAssignments(db, activeCol, fwId));
  return affected.size;
}

module.exports = { syncSpecEdAssignments, advanceAllGrades, calcGradeHours };
