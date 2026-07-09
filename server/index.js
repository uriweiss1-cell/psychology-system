const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDB } = require('./database');

async function main() {
  await initDB();

  const app = express();
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: '5mb' }));

  app.use('/api/employees',        require('./routes/employees'));
  app.use('/api/frameworks',       require('./routes/frameworks'));
  app.use('/api/assignments',      require('./routes/assignments'));
  app.use('/api/kinder',           require('./routes/kinder'));
  app.use('/api/teams',            require('./routes/teams'));
  app.use('/api/supervisions',     require('./routes/supervisions'));
  app.use('/api/spec-ed',          require('./routes/specEd'));
  app.use('/api/alerts',           require('./routes/alerts'));
  app.use('/api/settings',         require('./routes/settings'));
  app.use('/api/draft',            require('./routes/draft'));
  app.use('/api/import',           require('./routes/import'));

  app.get('/ping', (req, res) => res.json({ ok: true }));

  app.get('/api/public/employee-summary', (req, res) => {
    const { db } = require('./database');
    const employees    = db.get('employees').value().filter(e => e.status !== 'inactive');
    const teams        = db.get('teams').value();
    const supervisions = db.get('supervisions').value();
    const frameworks   = db.get('frameworks').value();
    const assignments  = db.get('assignments').value();
    const kinder       = db.get('kinderAssignments').value();

    const result = employees
      .slice()
      .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', 'he'))
      .map(emp => {
        const name = emp.displayName;
        const empTeams = teams
          .filter(t => t.headDisplayName === name || (t.memberDisplayNames || []).includes(name))
          .map(t => ({ type: t.type, isHead: t.headDisplayName === name, headName: t.headDisplayName }));
        const supReceived = supervisions.filter(s => (s.superviseeNames || []).includes(name));
        const supGiven    = supervisions.filter(s => s.supervisorName === name);
        const schools = assignments
          .filter(a => a.employeeId === emp.id && a.frameworkId !== 0)
          .map(a => { const fw = frameworks.find(f => f.id === a.frameworkId); return fw ? fw.name : null; })
          .filter(Boolean);
        const gardens = kinder
          .filter(k => k.employeeId === emp.id)
          .map(k => k.gardenName)
          .filter(Boolean);
        return { name, teams: empTeams, supReceived, supGiven, schools, gardens };
      });

    res.json(result);
  });

  app.get('/api/public/frameworks', (req, res) => {
    const { db } = require('./database');
    const employees  = db.get('employees').value();
    const frameworks = db.get('frameworks').value();
    const assignments = db.get('assignments').value();
    const kinder     = db.get('kinderAssignments').value();

    const schools = frameworks.map(fw => {
      const psychs = assignments
        .filter(a => a.frameworkId === fw.id && a.employeeId > 0)
        .map(a => { const e = employees.find(emp => emp.id === a.employeeId); return e ? { name: e.displayName, phone: e.phone || '' } : null; })
        .filter(Boolean);
      return { name: fw.name, type: 'school', psychologists: psychs };
    });

    const gardens = kinder.map(k => {
      const emp = k.employeeId ? employees.find(e => e.id === k.employeeId) : null;
      return { name: k.gardenName, type: 'kinder', psychologists: emp ? [{ name: emp.displayName, phone: emp.phone || '' }] : [] };
    });

    res.json([...schools, ...gardens]);
  });

  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('/employee', (req, res) => res.sendFile(path.join(clientDist, 'employee.html')));
    app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  const PORT = process.env.PORT || 3002;
  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
}

main().catch(console.error);
