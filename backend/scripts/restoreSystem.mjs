import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const ROOT_DIR = path.resolve(path.dirname(__filename), '..');
const ENV_PATH = path.join(ROOT_DIR, '.env');
dotenv.config({ path: ENV_PATH });

const defaults = {
  host: 'aws-1-us-east-1.pooler.supabase.com',
  port: '5432',
  name: 'postgres',
  user: 'postgres.eabyyyzucmjehildotvb',
  password: 'H0l@mundo123!'
};

const db = {
  host: process.env.DB_HOST || defaults.host,
  port: process.env.DB_PORT || defaults.port,
  name: process.env.DB_NAME || defaults.name,
  user: process.env.DB_USER || defaults.user,
  password: process.env.DB_PASSWORD || defaults.password
};

const inputArg = process.argv[2];
if (!inputArg) {
  console.error('Debes indicar la carpeta de backup. Ejemplo: npm run restore:system -- "backups/2026-03-25T12-00-00-000Z"');
  process.exit(1);
}

const backupDir = path.isAbsolute(inputArg) ? inputArg : path.join(ROOT_DIR, inputArg);
const dbBackupFile = path.join(backupDir, 'db.backup');
const uploadsBackupDir = path.join(backupDir, 'uploads');
const uploadsDir = path.join(ROOT_DIR, 'uploads');

if (!fs.existsSync(dbBackupFile)) {
  console.error(`No se encontro db.backup en: ${backupDir}`);
  process.exit(1);
}

const runCommand = (command, args, extraEnv = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv }
  });

  child.on('error', reject);
  child.on('exit', (code) => {
    if (code === 0) {
      resolve();
      return;
    }
    reject(new Error(`${command} finalizo con codigo ${code}`));
  });
});

const main = async () => {
  console.log('Iniciando restauracion de base de datos...');
  console.log('Asegurate de detener el backend antes de continuar para evitar conexiones activas.');

  await runCommand('pg_restore', [
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-privileges',
    '--schema', 'public',
    '-h', db.host,
    '-p', String(db.port),
    '-U', db.user,
    '-d', db.name,
    dbBackupFile
  ], { PGPASSWORD: db.password });

  if (fs.existsSync(uploadsBackupDir)) {
    console.log('Restaurando carpeta uploads...');
    fs.mkdirSync(uploadsDir, { recursive: true });
    fs.cpSync(uploadsBackupDir, uploadsDir, { recursive: true, force: true });
  } else {
    console.log('El backup no incluye carpeta uploads, se omite restauracion de archivos.');
  }

  console.log('\nRestauracion completada correctamente.');
};

main().catch((error) => {
  console.error('\nError al restaurar backup:', error.message);
  process.exit(1);
});
