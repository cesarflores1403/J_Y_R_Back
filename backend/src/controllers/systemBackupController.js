import systemBackupService from '../services/systemBackupService.js';
import archiver from 'archiver';
import fs from 'fs';

export const listarBackups = async (_req, res) => {
  try {
    const datos = await systemBackupService.listarBackups();
    return res.json({ ok: true, datos });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const ejecutarBackup = async (_req, res) => {
  try {
    const datos = await systemBackupService.ejecutarBackup();
    return res.status(201).json({ ok: true, datos, mensaje: 'Backup creado correctamente' });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const restaurarBackup = async (req, res) => {
  try {
    const { backupFolder } = req.body || {};
    const datos = await systemBackupService.restaurarBackup(backupFolder);
    return res.json({ ok: true, datos, mensaje: 'Backup restaurado correctamente' });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const descargarBackup = async (req, res) => {
  try {
    const { backupFolder } = req.query || {};
    const datos = await systemBackupService.prepararDescargaBackup(backupFolder);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${datos.downloadName}"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (error) => {
      throw error;
    });

    archive.pipe(res);
    archive.directory(datos.absolutePath, datos.folderName);
    await archive.finalize();
  } catch (error) {
    return res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const restaurarBackupArchivo = async (req, res) => {
  const filePath = req.file?.path;
  const originalName = req.file?.originalname;

  if (!filePath) {
    return res.status(400).json({ ok: false, mensaje: 'Debes subir un archivo de backup (.zip)' });
  }

  try {
    const datos = await systemBackupService.restaurarBackupDesdeArchivo(filePath, originalName);
    return res.json({ ok: true, datos, mensaje: 'Backup restaurado desde archivo correctamente' });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
};
