const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || '200.40.68.122',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'respaldo3',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'p4ng34t3ch',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('✅ Conectado a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Error inesperado en PostgreSQL:', err);
  process.exit(-1);
});

module.exports = pool;