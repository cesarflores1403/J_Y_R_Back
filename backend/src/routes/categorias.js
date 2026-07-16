import { Router } from 'express';
import { body } from 'express-validator';
import { validarCampos } from '../middlewares/validar.js';
import { autenticar } from '../middlewares/auth.js';
import { listar, listarActivas, obtener, crear, actualizar, toggleEstado, eliminar, exportarReportePdf } from '../controllers/categoriaProductoController.js';

const router = Router();

router.use(autenticar);

// GET /api/categorias — listado paginado con búsqueda
router.get('/', listar);

// GET /api/categorias/activas — solo activas (para selects)
router.get('/activas', listarActivas);

// GET /api/categorias/reporte/pdf — exportar reporte PDF
router.get('/reporte/pdf', exportarReportePdf);

// GET /api/categorias/:id — detalle
router.get('/:id', obtener);

// POST /api/categorias — crear
router.post('/', [
  body('nombre_categoria')
    .notEmpty().withMessage('El nombre de la categoría es requerido')
    .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  validarCampos
], crear);

// PUT /api/categorias/:id — actualizar
router.put('/:id', [
  body('nombre_categoria')
    .notEmpty().withMessage('El nombre de la categoría es requerido')
    .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  validarCampos
], actualizar);

// PATCH /api/categorias/:id/toggle-estado — activar/inactivar
router.patch('/:id/toggle-estado', toggleEstado);

// DELETE /api/categorias/:id — eliminar (bloqueado si tiene productos)
router.delete('/:id', eliminar);

export default router;
