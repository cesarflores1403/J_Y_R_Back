import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { autenticar, autorizar } from '../middlewares/auth.js';
import { listar, listarTodas, subir, actualizar, eliminar } from '../controllers/carruselController.js';

const router = express.Router();

/* ── Configuración de Multer ── */
const uploadsDir = path.resolve('uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `carrusel-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|svg/;
  const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowed.test(file.mimetype.split('/')[1]);
  if (extOk && mimeOk) return cb(null, true);
  cb(new Error('Solo se permiten imágenes (jpg, png, gif, webp, svg)'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB max
});

/* ── Rutas ── */

// Listar imágenes activas (público, usado por Login)
router.get('/', listar);

// Listar todas (admin)
router.get('/todas', autenticar, autorizar('Administrador'), listarTodas);

// Subir imagen (admin)
router.post('/', autenticar, autorizar('Administrador'), upload.single('imagen'), subir);

// Actualizar datos de imagen (admin)
router.put('/:codImagen', autenticar, autorizar('Administrador'), actualizar);

// Eliminar imagen (admin)
router.delete('/:codImagen', autenticar, autorizar('Administrador'), eliminar);

export default router;
