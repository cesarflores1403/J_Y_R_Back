import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { getMaintenanceDatabaseCredentials } from '../src/config/security.js';

const __filename = fileURLToPath(import.meta.url);
const ROOT_DIR = path.resolve(path.dirname(__filename), '..');
const ENV_PATH = path.join(ROOT_DIR, '.env');
dotenv.config({ path: ENV_PATH });

const requiredEnv = (name, fallback = null) => {
  const value = process.env[name] || fallback;
  if (!value || !String(value).trim()) {
    throw new Error(`Variable de entorno requerida no configurada: ${name}`);
  }
  return String(value).trim();
};

const db = {
  host: requiredEnv('DB_HOST'),
  port: requiredEnv('DB_PORT', '5432'),
  name: requiredEnv('DB_NAME'),
  ...getMaintenanceDatabaseCredentials()
};

const inputArg = process.argv[2];
if (!inputArg) {
  console.error('Debes indicar la carpeta de backup. Ejemplo: npm run restore:system -- "backups/2026-03-25T12-00-00-000Z"');
  process.exit(1);
}

const BACKUPS_ROOT = path.join(ROOT_DIR, 'backups');
const backupDir = path.resolve(path.isAbsolute(inputArg) ? inputArg : path.join(ROOT_DIR, inputArg));

if (backupDir !== BACKUPS_ROOT && !backupDir.startsWith(`${BACKUPS_ROOT}${path.sep}`)) {
  console.error('La ruta del backup no es valida.');
  process.exit(1);
}

if (backupDir.includes('..')) {
  console.error('La ruta del backup no es valida.');
  process.exit(1);
}

const dbBackupFile = path.join(backupDir, 'db.backup');
const metadataFile = path.join(backupDir, 'metadata.json');
const uploadsBackupDir = path.join(backupDir, 'uploads');
const uploadsDir = path.join(ROOT_DIR, 'uploads');

if (!fs.existsSync(dbBackupFile)) {
  console.error(`No se encontro db.backup en: ${backupDir}`);
  process.exit(1);
}

if (!fs.existsSync(metadataFile)) {
  console.error('No se encontro metadata.json en el backup seleccionado.');
  process.exit(1);
}

const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
const expectedHash = String(metadata.sha256_db_backup || metadata.sha256 || '').trim();

if (!expectedHash) {
  console.error('La metadata no contiene el hash SHA-256 del backup.');
  process.exit(1);
}

const hashFile = async (filePath) => new Promise((resolve, reject) => {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);

  stream.on('data', (chunk) => hash.update(chunk));
  stream.on('error', reject);
  stream.on('end', () => resolve(hash.digest('hex')));
});

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

const backupCurrentUploads = () => {
  if (!fs.existsSync(uploadsDir)) {
    return null;
  }

  const tempDir = path.join(BACKUPS_ROOT, `_uploads-backup-${Date.now()}`);
  fs.cpSync(uploadsDir, tempDir, { recursive: true, force: true });
  return tempDir;
};

const restoreUploads = (sourceDir) => {
  if (!sourceDir || !fs.existsSync(sourceDir)) {
    return;
  }

  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.cpSync(sourceDir, uploadsDir, { recursive: true, force: true });
};

const deleteDir = (targetDir) => {
  if (targetDir && fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
};

const main = async () => {
  const currentUploadsBackup = backupCurrentUploads();

  try {
    const actualHash = await hashFile(dbBackupFile);
    if (actualHash !== expectedHash) {
      throw new Error('El hash del backup no coincide');
    }

    console.log('Iniciando restauracion de base de datos...');
    console.log('Asegurate de detener el backend antes de continuar para evitar conexiones activas.');

    await runCommand('pg_restore', [
      '--clean',
      '--if-exists',
      '--exit-on-error',
      '--single-transaction',
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
      try {
        fs.rmSync(uploadsDir, { recursive: true, force: true });
        restoreUploads(uploadsBackupDir);
      } catch (error) {
        restoreUploads(currentUploadsBackup);
        throw error;
      }
    } else {
      console.log('El backup no incluye carpeta uploads, se omite restauracion de archivos.');
    }

    deleteDir(currentUploadsBackup);
    console.log('\nRestauracion completada correctamente.');
  } catch (error) {
    restoreUploads(currentUploadsBackup);
    console.error('\nError al restaurar backup:', error.message);
    process.exit(1);
  }
};

main();