import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import unzipper from 'unzipper';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.resolve(__dirname, '../..');
const BACKUPS_ROOT = path.join(BACKEND_ROOT, 'backups');
const BACKUP_IMPORTS_ROOT = path.join(BACKUPS_ROOT, '_imports');

if (!fs.existsSync(BACKUP_IMPORTS_ROOT)) {
  fs.mkdirSync(BACKUP_IMPORTS_ROOT, { recursive: true });
}

const timestampTag = () => new Date().toISOString().replace(/[:.]/g, '-');

const createError = (mensaje, statusCode = 400) => Object.assign(new Error(mensaje), { statusCode });

const requiredEnv = (name) => {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Variable de entorno requerida no configurada: ${name}`);
  }
  return String(value).trim();
};

const safeHashFile = async (filePath) => new Promise((resolve, reject) => {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);

  stream.on('data', (chunk) => hash.update(chunk));
  stream.on('error', reject);
  stream.on('end', () => resolve(hash.digest('hex')));
});

const runNodeScript = (scriptPath, args = []) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [scriptPath, ...args], {
    cwd: BACKEND_ROOT,
    env: process.env,
    stdio: 'pipe'
  });

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

  child.on('error', reject);
  child.on('exit', (code) => {
    if (code === 0) {
      resolve({ stdout, stderr });
      return;
    }

    const error = new Error(stderr || stdout || `Error ejecutando script (${code})`);
    error.statusCode = 500;
    reject(error);
  });
});

const normalizeBackupPath = (backupFolder) => {
  const input = String(backupFolder || '').trim();
  if (!input) {
    throw createError('Debes indicar el backup solicitado', 400);
  }

  const resolved = path.resolve(path.isAbsolute(input) ? input : path.join(BACKEND_ROOT, input));
  const withinBackups = resolved === BACKUPS_ROOT || resolved.startsWith(`${BACKUPS_ROOT}${path.sep}`);

  if (!withinBackups) {
    throw createError('La ruta del backup no es valida', 400);
  }

  if (resolved.includes('..')) {
    throw createError('La ruta del backup no es valida', 400);
  }

  return resolved;
};

const readMetadata = (backupDir) => {
  const metadataPath = path.join(backupDir, 'metadata.json');
  if (!fs.existsSync(metadataPath)) {
    throw createError('El backup no contiene metadata.json', 400);
  }

  try {
    return JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
  } catch {
    throw createError('No fue posible leer la metadata del backup', 400);
  }
};

const verifyDbBackupHash = async (backupDir) => {
  const dbBackupFile = path.join(backupDir, 'db.backup');
  if (!fs.existsSync(dbBackupFile)) {
    throw createError('El backup no contiene db.backup', 400);
  }

  const metadata = readMetadata(backupDir);
  const expectedHash = String(metadata.sha256_db_backup || metadata.sha256 || '').trim();
  if (!expectedHash) {
    throw createError('La metadata no contiene hash SHA-256 del respaldo', 400);
  }

  const actualHash = await safeHashFile(dbBackupFile);
  if (actualHash !== expectedHash) {
    throw createError('El hash del backup no coincide', 400);
  }

  return metadata;
};

const safeWriteExtractedEntry = async (entry, destinationRoot) => {
  const normalizedEntryPath = path.normalize(entry.path).replace(/^([/\\])+/, '');
  if (!normalizedEntryPath || normalizedEntryPath.includes('..') || path.isAbsolute(normalizedEntryPath)) {
    throw createError('El archivo ZIP contiene rutas no permitidas', 400);
  }

  const outputPath = path.resolve(destinationRoot, normalizedEntryPath);
  if (!outputPath.startsWith(`${destinationRoot}${path.sep}`) && outputPath !== destinationRoot) {
    throw createError('El archivo ZIP contiene rutas no permitidas', 400);
  }

  if (entry.type === 'Directory') {
    fs.mkdirSync(outputPath, { recursive: true });
    return;
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  await new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream(outputPath);
    entry.stream()
      .on('error', reject)
      .pipe(writeStream)
      .on('error', reject)
      .on('finish', resolve);
  });
};

const extractZipSafely = async (zipFilePath, destinationRoot) => {
  const directory = await unzipper.Open.file(zipFilePath);
  for (const entry of directory.files) {
    await safeWriteExtractedEntry(entry, destinationRoot);
  }
};

const findBackupRoot = (extractRoot) => {
  const dbInRoot = path.join(extractRoot, 'db.backup');
  if (fs.existsSync(dbInRoot)) {
    return extractRoot;
  }

  const children = fs.readdirSync(extractRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(extractRoot, entry.name));

  for (const childDir of children) {
    if (fs.existsSync(path.join(childDir, 'db.backup'))) {
      return childDir;
    }
  }

  throw createError('El archivo no contiene un backup valido (falta db.backup)', 400);
};

const backupUploadsCurrent = () => {
  const uploadsDir = path.join(BACKEND_ROOT, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    return null;
  }

  const tempDir = path.join(BACKUP_IMPORTS_ROOT, `uploads-backup-${timestampTag()}`);
  fs.cpSync(uploadsDir, tempDir, { recursive: true, force: true });
  return tempDir;
};

const restoreUploadsFrom = (sourceDir) => {
  const uploadsDir = path.join(BACKEND_ROOT, 'uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.cpSync(sourceDir, uploadsDir, { recursive: true, force: true });
};

class SystemBackupService {
  async ejecutarBackup() {
    const scriptPath = path.join(BACKEND_ROOT, 'scripts', 'backupSystem.mjs');
    const { stdout } = await runNodeScript(scriptPath);

    const match = stdout.match(/Ruta:\s*(.+)/i);
    const ruta = match?.[1]?.trim() || '';

    return {
      mensaje: 'Backup creado correctamente',
      ruta,
      salida: stdout
    };
  }

  async listarBackups() {
    if (!fs.existsSync(BACKUPS_ROOT)) {
      return [];
    }

    const carpetas = fs.readdirSync(BACKUPS_ROOT, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
      .map((entry) => entry.name)
      .sort((a, b) => b.localeCompare(a));

    return carpetas.map((folder) => {
      const fullPath = path.join(BACKUPS_ROOT, folder);
      const metadataPath = path.join(fullPath, 'metadata.json');
      const dbFile = path.join(fullPath, 'db.backup');
      const uploadsDir = path.join(fullPath, 'uploads');

      let metadata = null;
      if (fs.existsSync(metadataPath)) {
        try {
          metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        } catch {
          metadata = null;
        }
      }

      return {
        carpeta: folder,
        ruta_relativa: `backups/${folder}`,
        creado_en: metadata?.fecha || metadata?.createdAt || fs.statSync(fullPath).mtime.toISOString(),
        incluye_uploads: Boolean(metadata?.incluye_uploads ?? metadata?.includesUploads ?? fs.existsSync(uploadsDir)),
        tiene_db: fs.existsSync(dbFile),
        sha256_db_backup: metadata?.sha256_db_backup || metadata?.sha256 || null
      };
    });
  }

  async prepararDescargaBackup(backupFolder) {
    const normalizedPath = normalizeBackupPath(backupFolder);
    if (!fs.existsSync(normalizedPath)) {
      throw createError('El backup indicado no existe', 404);
    }

    return {
      absolutePath: normalizedPath,
      folderName: path.basename(normalizedPath),
      downloadName: `${path.basename(normalizedPath)}.zip`
    };
  }

  async restaurarBackup(backupFolder) {
    const normalizedPath = normalizeBackupPath(backupFolder);
    if (!fs.existsSync(normalizedPath)) {
      throw createError('El backup indicado no existe', 404);
    }

    await verifyDbBackupHash(normalizedPath);

    const relativeForScript = path.relative(BACKEND_ROOT, normalizedPath).replace(/\\/g, '/');
    const scriptPath = path.join(BACKEND_ROOT, 'scripts', 'restoreSystem.mjs');
    const { stdout } = await runNodeScript(scriptPath, [relativeForScript]);

    return {
      mensaje: 'Restore ejecutado correctamente',
      backup: relativeForScript,
      salida: stdout
    };
  }

  async restaurarBackupDesdeArchivo(zipFilePath, originalName = 'backup.zip') {
    if (!zipFilePath || !fs.existsSync(zipFilePath)) {
      throw createError('No se encontro el archivo de backup', 400);
    }

    if (path.extname(originalName || '').toLowerCase() !== '.zip') {
      throw createError('Solo se permite restaurar archivos .zip', 400);
    }

    const tempExtractDir = path.join(BACKUP_IMPORTS_ROOT, `extract-${timestampTag()}`);
    fs.mkdirSync(tempExtractDir, { recursive: true });

    try {
      await extractZipSafely(zipFilePath, tempExtractDir);
      const backupRoot = findBackupRoot(tempExtractDir);
      await verifyDbBackupHash(backupRoot);

      const importedFolderName = `uploaded-${timestampTag()}`;
      const importedFolderPath = path.join(BACKUPS_ROOT, importedFolderName);
      fs.cpSync(backupRoot, importedFolderPath, { recursive: true, force: true });

      const restoreData = await this.restaurarBackup(`backups/${importedFolderName}`);

      return {
        ...restoreData,
        archivo_original: originalName,
        carpeta_importada: importedFolderName
      };
    } finally {
      fs.rmSync(tempExtractDir, { recursive: true, force: true });
    }
  }

  async aplicarRetencion() {
    const retentionDays = Number.parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
    if (!Number.isInteger(retentionDays) || retentionDays <= 0) {
      return { eliminados: 0 };
    }

    const limite = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    if (!fs.existsSync(BACKUPS_ROOT)) {
      return { eliminados: 0 };
    }

    let eliminados = 0;
    for (const entry of fs.readdirSync(BACKUPS_ROOT, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith('_')) {
        continue;
      }

      const fullPath = path.join(BACKUPS_ROOT, entry.name);
      const stat = fs.statSync(fullPath);
      if (stat.mtimeMs < limite) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        eliminados += 1;
      }
    }

    return { eliminados };
  }
}

export {
  BACKEND_ROOT,
  BACKUPS_ROOT,
  backupUploadsCurrent,
  createError,
  findBackupRoot,
  normalizeBackupPath,
  readMetadata,
  restoreUploadsFrom,
  safeHashFile,
  verifyDbBackupHash
};

export default new SystemBackupService();