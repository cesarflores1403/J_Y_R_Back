import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { seedSystemData } from './lib/seedSystemData.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env') });

if (!process.argv.includes('--confirm')) {
  throw new Error('Operacion destructiva. Ejecuta nuevamente agregando --confirm.');
}
const required = (name) => {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`Falta ${name} en backend/.env`);
  return value;
};

const host = required('DB_HOST');
if (!['127.0.0.1', 'localhost', '::1'].includes(host.toLowerCase())) {
  throw new Error(`Limpieza bloqueada: DB_HOST debe ser local y actualmente es ${host}`);
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
  const superAdmin = await client.query(
    `SELECT u.nombre_usuario, u.contrasena
       FROM usuarios u
       JOIN usuarios_rol ur ON ur.cod_usuario = u.cod_usuario
       JOIN roles r ON r.cod_rol = ur.cod_rol
      WHERE r.nombre_rol = 'Super Administrador' AND u.estado_usuario = true
      ORDER BY u.cod_usuario LIMIT 1`
  );
  if (!superAdmin.rowCount) {
    throw new Error('No existe un Super Administrador activo para conservar.');
  }

  await client.query('BEGIN');
  const tables = await client.query(
    `SELECT quote_ident(tablename) AS name
       FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  );
  await client.query(`TRUNCATE TABLE ${tables.rows.map((row) => row.name).join(', ')} RESTART IDENTITY CASCADE`);
  await seedSystemData(client, {
    username: superAdmin.rows[0].nombre_usuario,
    passwordHash: superAdmin.rows[0].contrasena
  });
  await client.query('COMMIT');
  console.log('Base local limpia. Se conservaron catalogos del sistema y un Super Administrador.');
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  throw error;
} finally {
  await client.end();
}
