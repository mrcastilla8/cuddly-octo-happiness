import { readFileSync } from 'node:fs';
import pg from '../../backend/node_modules/pg/lib/index.js';
import { officialMigrations } from '../../backend/apps/promotions-svc/test/support/official-migrations.mjs';

const { Pool } = pg;
const port = Number(process.env.H4_PG_PORT);
const adminPassword = process.env.H4_PG_ADMIN_PASSWORD;
const runtimePassword = process.env.H4_PG_RUNTIME_PASSWORD;
if (!port || !adminPassword || !runtimePassword || !process.env.PGSSLROOTCERT)
  throw new Error('LAB_CONFIGURATION_INCOMPLETE');
const pool = new Pool({
  host: '127.0.0.1', port, user: 'postgres', password: adminPassword,
  database: 'postgres', ssl: { rejectUnauthorized: true, ca: readFileSync(process.env.PGSSLROOTCERT, 'utf8') },
});
try {
  await pool.query('CREATE ROLE po_promotions_owner NOLOGIN; CREATE ROLE po_promotions_runtime NOLOGIN; CREATE SCHEMA promotions AUTHORIZATION po_promotions_owner');
  const client = await pool.connect();
  try {
    await client.query('BEGIN; SET LOCAL ROLE po_promotions_owner');
    for (const migration of await officialMigrations()) await client.query(migration);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
  if (!/^[a-f0-9-]{36}$/.test(runtimePassword)) throw new Error('LAB_PASSWORD_FORMAT_INVALID');
  await pool.query(`CREATE ROLE promotions_lab_login LOGIN PASSWORD '${runtimePassword}' IN ROLE po_promotions_runtime`);
  await pool.query('GRANT USAGE ON SCHEMA promotions TO po_promotions_runtime');
  console.log(JSON.stringify({ status: 'PASS', tls: true, migrations: 4, schema: 'promotions', runtimeRole: 'promotions_lab_login' }));
} finally { await pool.end(); }
