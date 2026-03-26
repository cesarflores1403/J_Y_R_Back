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

const runNodeScript = (scriptPath, args = []) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [scriptPath, ...args], {
    cwd: BACKEND_ROOT,
    env: process.env
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
    const err = new Error(stderr || stdout || `Error ejecutando script (${code})`);
    err.statusCode = 500;
    reject(err);
  });
});

const normalizeBackupPath = (backupFolder) => {
  const resolved = path.resolve(BACKEND_ROOT, backupFolder);
  if (!resolved.startsWith(BACKUPS_ROOT)) {
    const err = new Error('La ruta del backup no es valida');
    err.statusCode = 400;
    throw err;
  }
  return resolved;
};

const timestampTag = () => new Date().toISOString().replace(/[:.]/g, '-');

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

  const err = new Error('El archivo no contiene un backup valido (falta db.backup)');
  err.statusCode = 400;
  throw err;
};

class SystemBackupService {
  async ejecutarBackup() {
    const scriptPath = path.join(BACKEND_ROOT, 'scripts', 'backupSystem.mjs');
    const { stdout } = await runNodeScript(scriptPath);

    const match = stdout.match(/Ruta:\s*(.+)/i);
    const ruta = match?.[1]?.trim() || '';

    return {
      mensaje: 'Backup generado correctamente',
      ruta,
      salida: stdout
    };
  }

  async listarBackups() {
    if (!fs.existsSync(BACKUPS_ROOT)) {
      return [];
    }

    const carpetas = fs.readdirSync(BACKUPS_ROOT, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
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
        creado_en: metadata?.createdAt || fs.statSync(fullPath).mtime.toISOString(),
        incluye_uploads: Boolean(metadata?.includesUploads || fs.existsSync(uploadsDir)),
        tiene_db: fs.existsSync(dbFile)
      };
    });
  }

  async prepararDescargaBackup(backupFolder) {
    if (!backupFolder || !String(backupFolder).trim()) {
      const err = new Error('Debes indicar el backup a descargar');
      err.statusCode = 400;
      throw err;
    }

    const normalizedPath = normalizeBackupPath(String(backupFolder).trim());
    if (!fs.existsSync(normalizedPath)) {
      const err = new Error('El backup indicado no existe');
      err.statusCode = 404;
      throw err;
    }

    const folderName = path.basename(normalizedPath);

    return {
      absolutePath: normalizedPath,
      folderName,
      downloadName: `${folderName}.zip`
    };
  }

  async restaurarBackup(backupFolder) {
    if (!backupFolder || !String(backupFolder).trim()) {
      const err = new Error('Debes indicar el backup a restaurar');
      err.statusCode = 400;
      throw err;
    }

    const normalizedPath = normalizeBackupPath(String(backupFolder).trim());
    if (!fs.existsSync(normalizedPath)) {
      const err = new Error('El backup indicado no existe');
      err.statusCode = 404;
      throw err;
    }

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
      const err = new Error('No se encontro el archivo de backup');
      err.statusCode = 400;
      throw err;
    }

    const ext = path.extname(originalName || '').toLowerCase();
    if (ext !== '.zip') {
      const err = new Error('Solo se permite restaurar archivos .zip');
      err.statusCode = 400;
      throw err;
    }

    const tempExtractDir = path.join(BACKUP_IMPORTS_ROOT, `extract-${timestampTag()}`);
    fs.mkdirSync(tempExtractDir, { recursive: true });

    await fs.createReadStream(zipFilePath)
      .pipe(unzipper.Extract({ path: tempExtractDir }))
      .promise();

    const backupRoot = findBackupRoot(tempExtractDir);
    const importedFolderName = `uploaded-${timestampTag()}`;
    const importedFolderPath = path.join(BACKUPS_ROOT, importedFolderName);
    fs.cpSync(backupRoot, importedFolderPath, { recursive: true, force: true });

    const restoreData = await this.restaurarBackup(`backups/${importedFolderName}`);

    return {
      ...restoreData,
      archivo_original: originalName,
      carpeta_importada: importedFolderName
    };
  }
}

export default new SystemBackupService();
