import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const ROOT_DIR = path.resolve(path.dirname(__filename), '..');
const ENV_PATH = path.join(ROOT_DIR, '.env');
dotenv.config({ path: ENV_PATH });

const db = {
  host: requiredEnv('DB_HOST'),
  port: process.env.DB_PORT || '5432',
  name: requiredEnv('DB_NAME'),
  user: process.env.DB_MAINTENANCE_USER || requiredEnv('DB_USER'),
  password: process.env.DB_MAINTENANCE_PASSWORD || requiredEnv('DB_PASSWORD')
};

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupRoot = path.join(ROOT_DIR, 'backups');
const backupDir = path.join(backupRoot, timestamp);
const dbBackupFile = path.join(backupDir, 'db.backup');
const uploadsDir = path.join(ROOT_DIR, 'uploads');
const uploadsBackupDir = path.join(backupDir, 'uploads');

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
  fs.mkdirSync(backupDir, { recursive: true });

  console.log('Iniciando backup de base de datos...');
  await runCommand('pg_dump', [
    '-h', db.host,
    '-p', String(db.port),
    '-U', db.user,
    '-d', db.name,
    '--schema', 'public',
    '--no-owner',
    '--no-privileges',
    '-F', 'c',
    '-f', dbBackupFile
  ], { PGPASSWORD: db.password });

  if (fs.existsSync(uploadsDir)) {
    console.log('Copiando carpeta uploads...');
    fs.cpSync(uploadsDir, uploadsBackupDir, { recursive: true, force: true });
  } else {
    console.log('No existe carpeta uploads, se omite respaldo de archivos.');
  }

  const meta = {
    createdAt: new Date().toISOString(),
    backupDir,
    database: {
      host: db.host,
      port: db.port,
      name: db.name,
      user: db.user
    },
    includesUploads: fs.existsSync(uploadsBackupDir)
  };

  fs.writeFileSync(path.join(backupDir, 'metadata.json'), JSON.stringify(meta, null, 2), 'utf8');

  console.log('\nBackup completado correctamente.');
  console.log(`Ruta: ${backupDir}`);
  console.log('Para restaurar: npm run restore:system -- "backups/<carpeta-backup>"');
};

main().catch((error) => {
  console.error('\nError al generar backup:', error.message);
  process.exit(1);
});
