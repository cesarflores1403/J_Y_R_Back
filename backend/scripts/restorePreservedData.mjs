import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import pg from 'pg';
import { fileURLToPath } from 'url';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const projectDir = path.resolve(backendDir, '..');
dotenv.config({ path: path.join(backendDir, '.env') });

if (!process.argv.includes('--confirm')) {
  throw new Error('Operacion de restauracion. Ejecuta nuevamente agregando --confirm.');
}

const required = (name) => {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`Falta ${name} en backend/.env`);
  return value;
};

const host = required('DB_HOST');
if (!['127.0.0.1', 'localhost', '::1'].includes(host.toLowerCase())) {
  throw new Error('La restauracion solo permite PostgreSQL en esta misma maquina.');
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
  const operational = await client.query(`
    SELECT
      (SELECT COUNT(*) FROM public.factura) +
      (SELECT COUNT(*) FROM public.clientes) +
      (SELECT COUNT(*) FROM public.producto) AS total
  `);

  if (Number(operational.rows[0].total) > 0) {
    throw new Error(
      'Restauracion detenida: la base ya contiene facturas, clientes o productos. ' +
      'No se sobrescribio ningun dato.'
    );
  }

  const sqlPath = path.join(projectDir, 'database', 'jyr_preserved_data.sql');
  const sql = (await fs.readFile(sqlPath, 'utf8'))
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith('\\'))
    .join('\n');

  await client.query(sql);

  const verification = await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM public.usuarios) AS usuarios,
      (SELECT COUNT(*)::int FROM public.usuarios_rol) AS usuarios_rol,
      (SELECT COUNT(*)::int FROM public.empresa_config) AS empresa_config,
      (SELECT COUNT(*)::int FROM public.carrusel_imagenes) AS carrusel
  `);
  const result = verification.rows[0];

  if (result.usuarios !== 5 || result.usuarios_rol !== 5 ||
      result.empresa_config !== 1 || result.carrusel !== 9) {
    throw new Error(`Verificacion inesperada: ${JSON.stringify(result)}`);
  }

  console.log('Usuarios, configuracion y carrusel restaurados correctamente.');
  console.log(JSON.stringify(result));
} finally {
  await client.end();
}
