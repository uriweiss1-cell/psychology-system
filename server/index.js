const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initDB } = require('./database');

async function main() {
  await initDB();

  const app = express();
  app.use(cors({ origin: true }));
  app.use(express.json());

  app.use('/api/employees',        require('./routes/employees'));
  app.use('/api/frameworks',       require('./routes/frameworks'));
  app.use('/api/assignments',      require('./routes/assignments'));
  app.use('/api/kinder',           require('./routes/kinder'));
  app.use('/api/teams',            require('./routes/teams'));

  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  const PORT = process.env.PORT || 3002;
  app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
}

main().catch(console.error);
