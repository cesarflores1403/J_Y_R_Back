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

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupRoot = path.join(ROOT_DIR, 'backups');
const backupDir = path.join(backupRoot, timestamp);
const dbBackupFile = path.join(backupDir, 'db.backup');
const uploadsDir = path.join(ROOT_DIR, 'uploads');
const uploadsBackupDir = path.join(backupDir, 'uploads');
const backupVersion = '1.0';

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

const hashFile = async (filePath) => new Promise((resolve, reject) => {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);

  stream.on('data', (chunk) => hash.update(chunk));
  stream.on('error', reject);
  stream.on('end', () => resolve(hash.digest('hex')));
});

const cleanupOldBackups = () => {
  const retentionDays = Number.parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
  if (!Number.isInteger(retentionDays) || retentionDays <= 0 || !fs.existsSync(backupRoot)) {
    return;
  }

  const cutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
  for (const entry of fs.readdirSync(backupRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('_')) {
      continue;
    }

    const fullPath = path.join(backupRoot, entry.name);
    const stat = fs.statSync(fullPath);
    if (stat.mtimeMs < cutoff) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    }
  }
};

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

  if (!fs.existsSync(dbBackupFile)) {
    throw new Error('pg_dump no genero db.backup');
  }

  const sha256DbBackup = await hashFile(dbBackupFile);
  const stats = fs.statSync(dbBackupFile);

  if (fs.existsSync(uploadsDir)) {
    console.log('Copiando carpeta uploads...');
    fs.cpSync(uploadsDir, uploadsBackupDir, { recursive: true, force: true });
  } else {
    console.log('No existe carpeta uploads, se omite respaldo de archivos.');
  }

  const meta = {
    fecha: new Date().toISOString(),
    base_datos: db.name,
    version_respaldo: backupVersion,
    tamano_bytes: stats.size,
    sha256_db_backup: sha256DbBackup,
    incluye_uploads: fs.existsSync(uploadsBackupDir)
  };

  fs.writeFileSync(path.join(backupDir, 'metadata.json'), JSON.stringify(meta, null, 2), 'utf8');
  cleanupOldBackups();

  console.log('\nBackup completado correctamente.');
  console.log(`Ruta: ${backupDir}`);
  console.log('Para restaurar: npm run restore:system -- "backups/<carpeta-backup>"');
};

main().catch((error) => {
  console.error('\nError al generar backup:', error.message);
  process.exit(1);
});