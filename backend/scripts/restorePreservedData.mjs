import path from 'path';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
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

const sqlFile = path.join(projectDir, 'database', 'jyr_preserved_data.sql');
const args = [
  '-v', 'ON_ERROR_STOP=1',
  '-h', host,
  '-p', String(process.env.DB_PORT || 5432),
  '-U', required('DB_USER'),
  '-d', required('DB_NAME'),
  '-f', sqlFile
];

const child = spawn('psql', args, {
  stdio: 'inherit',
  env: { ...process.env, PGPASSWORD: required('DB_PASSWORD') }
});

child.on('error', (error) => {
  console.error('No se pudo ejecutar psql:', error.message);
  process.exit(1);
});

child.on('exit', (code) => {
  if (code !== 0) process.exit(code || 1);
  console.log('Usuarios, configuracion y carrusel restaurados correctamente.');
});
