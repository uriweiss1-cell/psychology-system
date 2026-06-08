const express = require('express');
const router = express.Router();
const { db, activeCol } = require('../database');

// Remove employee (by displayName) from teams and supervisions (draft-aware)
function removeFromTeamsAndSupervisions(db, activeCol, displayName) {
  const teamsCol = activeCol('teams');
  const supCol   = activeCol('supervisions');

  db.get(teamsCol).value().forEach(team => {
    if (team.headDisplayName === displayName) {
      db.get(teamsCol).remove({ id: team.id }).write();
    } else {
      const filtered = (team.memberDisplayNames || []).filter(n => n !== displayName);
      if (filtered.length !== (team.memberDisplayNames || []).length) {
        db.get(teamsCol).find({ id: team.id }).assign({ memberDisplayNames: filtered }).write();
      }
    }
  });

  const supervisions = db.get(supCol).value();
  supervisions.forEach(sup => {
    if (sup.supervisorName === displayName) {
      db.get(supCol).remove({ id: sup.id }).write();
      return;
    }
    const filtered = (sup.superviseeNames || []).filter(n => n !== displayName);
    if (filtered.length !== (sup.superviseeNames || []).length) {
      if (filtered.length === 0) {
        db.get(supCol).remove({ id: sup.id }).write();
      } else {
        db.get(supCol).find({ id: sup.id }).assign({ superviseeNames: filtered }).write();
      }
    }
  });
}

// Auto-compute displayName: firstName if unique, else firstName + " " + lastName[0] + "."
function recalcDisplayNames(db, col, firstName) {
  if (!firstName) return;
  const group = db.get(col).filter({ firstName }).value();
  if (group.length <= 1) {
    group.forEach(e => db.get(col).find({ id: e.id }).assign({ displayName: e.firstName }).write());
  } else {
    group.forEach(e => {
      const suffix = e.lastName ? ' ' + e.lastName[0] + '.' : ' .';
      db.get(col).find({ id: e.id }).assign({ displayName: e.firstName + suffix }).write();
    });
  }
}

// Computed fields helper — uses active collection for both employees and assignments
function withComputed(emp) {
  const fteHours = Math.ceil(emp.ftePercent * 40);
  const totalInternal = (emp.meetingHours || 0) + (emp.supReceivedHours || 0) +
    (emp.supGivenHours || 0) + (emp.therapyHours || 0) + (emp.roleHours || 0);

  const assignment = db.get(activeCol('assignments')).find({ employeeId: emp.id }).value();
  const totalFrameworks = assignment
    ? (assignment.hours || 0) + (assignment.specEdHours || 0) + (assignment.kinderHours || 0)
    : 0;

  const freeHours = Math.round((fteHours - totalInternal - totalFrameworks) * 100) / 100;
  const balance = freeHours;

  return { ...emp, fteHours, totalInternal, totalFrameworks, freeHours, balance };
}

router.get('/', (req, res) => {
  const col = activeCol('employees');
  let emps = db.get(col).value();
  if (req.query.activeOnly) emps = emps.filter(e => e.status !== 'inactive' && e.status !== 'maternity');
  res.json(emps.map(withComputed));
});

router.get('/:id', (req, res) => {
  const emp = db.get(activeCol('employees')).find({ id: +req.params.id }).value();
  if (!emp) return res.status(404).json({ error: 'לא נמצא' });
  res.json(withComputed(emp));
});

router.put('/:id', (req, res) => {
  const col = activeCol('employees');
  const id  = +req.params.id;
  const emp = db.get(col).find({ id }).value();
  if (!emp) return res.status(404).json({ error: 'לא נמצא' });

  const allowed = ['displayName','firstName','lastName','ftePercent','type','status','isSubstitute',
    'meetingHours','supReceivedHours','supGivenHours','therapyHours',
    'roleHours','roleName','officeHours','notes'];
  const update = {};
  allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

  const oldFirstName = emp.firstName;
  db.get(col).find({ id }).assign(update).write();

  // Recalc displayNames when name changes
  if (update.firstName !== undefined || update.lastName !== undefined) {
    const nowFirst = db.get(col).find({ id }).value().firstName;
    recalcDisplayNames(db, col, nowFirst);
    if (update.firstName !== undefined && update.firstName !== oldFirstName) {
      recalcDisplayNames(db, col, oldFirstName); // fix former group too
    }
  }

  // When returning from maternity/inactive → set meetingHours to 4 if currently 0
  if (update.status === 'active') {
    const current = db.get(col).find({ id }).value();
    if (!current.meetingHours) {
      db.get(col).find({ id }).assign({ meetingHours: 4 }).write();
    }
  }

  // When going to maternity/inactive — remove from assignments, teams and supervisions
  if (update.status === 'maternity' || update.status === 'inactive') {
    ['assignments', 'kinderAssignments'].forEach(name => {
      const items = db.get(activeCol(name)).filter({ employeeId: id }).value();
      items.forEach(a => {
        db.get(activeCol(name)).find({ id: a.id }).assign({ employeeId: 0 }).write();
      });
    });
    const currentEmp = db.get(col).find({ id }).value();
    removeFromTeamsAndSupervisions(db, activeCol, currentEmp.displayName);
  }

  const updated = db.get(col).find({ id }).value();
  res.json(withComputed(updated));
});

router.post('/', (req, res) => {
  const col    = activeCol('employees');
  const nextId = db.get('_nextId.employees').value();
  const emp = {
    id: nextId,
    displayName: req.body.displayName || '',
    firstName:   req.body.firstName || '',
    lastName:    req.body.lastName || '',
    ftePercent:  req.body.ftePercent || 1.0,
    type:        req.body.type || 'expert',
    status:      'active',
    isSubstitute: false,
    meetingHours: 4, supReceivedHours: 0, supGivenHours: 0,
    therapyHours: 0, roleHours: 0, roleName: '',
    officeHours: 0, notes: ''
  };
  db.get(col).push(emp).write();
  db.set('_nextId.employees', nextId + 1).write();
  recalcDisplayNames(db, col, emp.firstName);
  const created = db.get(col).find({ id: nextId }).value();
  res.json(withComputed(created));
});

router.delete('/:id', (req, res) => {
  const col = activeCol('employees');
  const id  = +req.params.id;
  const emp = db.get(col).find({ id }).value();
  db.get(col).remove({ id }).write();
  db.get(activeCol('assignments')).filter({ employeeId: id }).value()
    .forEach(a => db.get(activeCol('assignments')).find({ id: a.id }).assign({ employeeId: 0 }).write());
  db.get(activeCol('kinderAssignments')).remove({ employeeId: id }).write();
  if (emp) removeFromTeamsAndSupervisions(db, activeCol, emp.displayName);
  res.json({ ok: true });
});

module.exports = router;
