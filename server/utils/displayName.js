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

module.exports = { recalcDisplayNames };
