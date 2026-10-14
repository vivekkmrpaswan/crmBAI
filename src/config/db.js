const { Pool } = require('pg');
const { databaseUrl } = require('./env');


const isLocal = /@(localhost|127\.0\.0\.1)(:|\/|$)/.test(databaseUrl);
const connectionString = databaseUrl.replace(/([?&])sslmode=[^&]*&?/, '$1').replace(/[?&]$/, '');

const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

const initDB = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name          TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS enquiries (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name            TEXT NOT NULL,
      email           TEXT NOT NULL,
      phone           TEXT,
      course_interest TEXT NOT NULL,
      message         TEXT,
      -- NULL => public (unclaimed). Set => private to that employee.
      claimed_by      UUID REFERENCES employees(id),
      claimed_at      TIMESTAMPTZ,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS enquiries_claimed_by_created_idx
      ON enquiries (claimed_by, created_at DESC);
  `);
  console.log('PostgreSQL connected, schema ready');
};

module.exports = { pool, initDB };