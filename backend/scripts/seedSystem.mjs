import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { hashInitialPassword, seedSystemData } from './lib/seedSystemData.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });
const required = (name) => {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`Falta ${name} en backend/.env`);
  return value;
};

const host = required('DB_HOST');
if (!['127.0.0.1', 'localhost', '::1'].includes(host.toLowerCase())) {
  throw new Error('La instalacion solo permite PostgreSQL en la misma maquina virtual.');
}
const client = new pg.Client({
  host,
  port: Number(process.env.DB_PORT || 5432),
  database: required('DB_NAME'),
  user: required('DB_USER'),
  password: required('DB_PASSWORD'),
  ssl: false
});

await client.connect();
try {
  const existing = await client.query('SELECT COUNT(*)::int AS total FROM usuarios');
  const username = existing.rows[0].total === 0 ? required('INITIAL_ADMIN_USERNAME') : null;
  const passwordHash = existing.rows[0].total === 0
    ? await hashInitialPassword(required('INITIAL_ADMIN_PASSWORD'))
    : null;
  await client.query('BEGIN');
  await seedSystemData(client, { username, passwordHash });
  await client.query('COMMIT');
  console.log('Catalogos y acceso inicial preparados correctamente.');
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  throw error;
} finally {
  await client.end();
}
