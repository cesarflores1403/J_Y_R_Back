import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getProducto, createProducto, updateProducto, deleteProducto, cambiarEstado, cambiarEstadoMasivo, subirImagen, eliminarImagen } from '../controllers/productoController.js';
import { importarProductos, descargarPlantilla } from '../controllers/importacionController.js';
import {
  validarCrearProducto,
  validarActualizarProducto,
  validarCambiarEstado,
  validarCambiarEstadoMasivo,
  validarEliminarProducto
} from '../middlewares/productoValidator.js';
import { autenticarOpcional } from '../middlewares/auth.js';

const router = express.Router();

router.use(autenticarOpcional);

// =======================
// HU-08: Configuración Multer para imágenes de producto
// =======================
const uploadsDir = path.resolve('uploads/productos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `producto-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (_req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png/;
  const extOk = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimeOk = allowedTypes.test(file.mimetype.split('/')[1]);
  if (extOk && mimeOk) return cb(null, true);
  cb(new Error('Solo se permiten imágenes JPG o PNG.'));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // 2 MB max
});

// GET /api/v1/productos
router.get('/', getProducto);

// POST /api/v1/productos
router.post('/', validarCrearProducto, createProducto);

// PUT /api/v1/productos
router.put('/', validarActualizarProducto, updateProducto);

// PATCH /api/v1/productos/estado — Cambiar estado (Activo/Inactivo/Descontinuado)
router.patch('/estado', validarCambiarEstado, cambiarEstado);

// PATCH /api/v1/productos/estado-masivo — Cambiar estado de múltiples productos
router.patch('/estado-masivo', validarCambiarEstadoMasivo, cambiarEstadoMasivo);

// DELETE /api/v1/productos
router.delete('/', validarEliminarProducto, deleteProducto);

// =======================
// HU-08: Rutas de imagen de producto
// =======================

// POST /api/v1/productos/:codProducto/imagen — Subir o reemplazar imagen
router.post('/:codProducto/imagen', upload.single('imagen'), subirImagen);

// DELETE /api/v1/productos/:codProducto/imagen — Eliminar imagen
router.delete('/:codProducto/imagen', eliminarImagen);

// =======================
// HU-12: Importación masiva de productos
// =======================
const uploadImport = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = /csv|xlsx|xls|vnd\.openxmlformats|vnd\.ms-excel|comma-separated/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv', '.xlsx', '.xls'].includes(ext) || allowed.test(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten archivos CSV o Excel (.xlsx, .xls).'));
  }
});

// POST /api/v1/productos/importar — Importar productos desde CSV/Excel
router.post('/importar', uploadImport.single('archivo'), importarProductos);

// GET /api/v1/productos/plantilla — Descargar plantilla CSV
router.get('/plantilla', descargarPlantilla);

export default router;
