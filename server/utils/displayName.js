function updateNameReferences(db, activeColFn, oldName, newName) {
  const supCol   = activeColFn('supervisions');
  const teamsCol = activeColFn('teams');

  db.get(supCol).value().forEach(s => {
    if (s.supervisorName === oldName)
      db.get(supCol).find({ id: s.id }).assign({ supervisorName: newName }).write();
    if ((s.superviseeNames || []).includes(oldName))
      db.get(supCol).find({ id: s.id }).assign({ superviseeNames: s.superviseeNames.map(n => n === oldName ? newName : n) }).write();
  });

  db.get(teamsCol).value().forEach(t => {
    if (t.headDisplayName === oldName)
      db.get(teamsCol).find({ id: t.id }).assign({ headDisplayName: newName }).write();
    if ((t.memberDisplayNames || []).includes(oldName))
      db.get(teamsCol).find({ id: t.id }).assign({ memberDisplayNames: t.memberDisplayNames.map(n => n === oldName ? newName : n) }).write();
  });
}

function recalcDisplayNames(db, col, firstName, activeColFn) {
  if (!firstName) return;
  const group = db.get(col).filter({ firstName }).value();

  const updates = [];
  if (group.length <= 1) {
    group.forEach(e => updates.push({ id: e.id, oldName: e.displayName, newName: e.firstName }));
  } else {
    group.forEach(e => {
      const suffix = e.lastName ? ' ' + e.lastName[0] + '.' : ' .';
      updates.push({ id: e.id, oldName: e.displayName, newName: e.firstName + suffix });
    });
  }

  updates.forEach(({ id, oldName, newName }) => {
    db.get(col).find({ id }).assign({ displayName: newName }).write();
    if (activeColFn && oldName && oldName !== newName) {
      updateNameReferences(db, activeColFn, oldName, newName);
    }
  });
}

module.exports = { recalcDisplayNames };
