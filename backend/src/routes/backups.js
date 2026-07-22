import { Router } from 'express';
import { body, query } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { autenticar, autorizar } from '../middlewares/auth.js';
import { validarCampos } from '../middlewares/validar.js';
import {
  listarBackups,
  ejecutarBackup,
  restaurarBackup,
  descargarBackup,
  restaurarBackupArchivo
} from '../controllers/systemBackupController.js';

const router = Router();

const uploadsTempDir = path.resolve('backups/_uploads');
if (!fs.existsSync(uploadsTempDir)) {
  fs.mkdirSync(uploadsTempDir, { recursive: true });
}

const maxUploadMb = Number.parseInt(process.env.BACKUP_MAX_UPLOAD_MB || '512', 10);
const maxUploadBytes = Number.isInteger(maxUploadMb) && maxUploadMb > 0
  ? maxUploadMb * 1024 * 1024
  : 512 * 1024 * 1024;

const uploadZip = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsTempDir),
    filename: (_req, file, cb) => {
      const stamp = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `backup-upload-${stamp}${path.extname(file.originalname).toLowerCase() || '.zip'}`);
    }
  }),
  limits: { fileSize: maxUploadBytes },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.zip') {
      return cb(null, true);
    }
    return cb(new Error('Solo se permiten archivos .zip'));
  }
});

router.use(autenticar);
router.use(autorizar('Administrador'));

router.get('/', listarBackups);
router.post('/run', ejecutarBackup);
router.get('/download', [
  query('backupFolder').notEmpty().withMessage('backupFolder es requerido'),
  validarCampos
], descargarBackup);
router.post('/restore', [
  body('backupFolder').notEmpty().withMessage('backupFolder es requerido'),
  validarCampos
], restaurarBackup);
router.post('/restore-file', uploadZip.single('backupFile'), restaurarBackupArchivo);

export default router;
