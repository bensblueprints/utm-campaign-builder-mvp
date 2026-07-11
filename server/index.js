require('dotenv').config();
const path = require('path');
const { createApp } = require('./app');

const PORT = Number(process.env.PORT) || 5349;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'utmcraft.db');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';

const app = createApp({ dbPath: DB_PATH, adminPassword: ADMIN_PASSWORD });

app.listen(PORT, () => {
  console.log(`UTMcraft listening on http://localhost:${PORT}`);
  if (ADMIN_PASSWORD === 'admin') {
    console.log('⚠ Using default admin password — set ADMIN_PASSWORD in .env for production.');
  }
});
