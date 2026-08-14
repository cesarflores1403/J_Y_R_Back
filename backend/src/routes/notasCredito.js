import { Router } from 'express';
import { body } from 'express-validator';
import { autenticar, autorizar } from '../middlewares/auth.js';
import { validarCampos } from '../middlewares/validar.js';
import { listar, obtener, obtenerDetallesFactura, crear, anular } from '../controllers/notaCreditoController.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(autenticar);

// Listar notas de crédito
router.get('/', listar);

// Obtener detalles de factura para crear NC (ítems disponibles a devolver)
// IMPORTANTE: esta ruta debe ir ANTES de /:id para que Express no capture "factura" como :id
router.get('/factura/:codFactura/detalles', obtenerDetallesFactura);

// Obtener nota de crédito por ID
router.get('/:id', obtener);

// Crear nota de crédito (solo Administrador y Cajero)
const validarCrearNC = [
  body('cod_factura').isInt({ min: 1 }).withMessage('La factura origen es requerida'),
  body('motivo').notEmpty().withMessage('El motivo es obligatorio'),
  body('items').isArray({ min: 1 }).withMessage('Debe seleccionar al menos 1 ítem a devolver'),
  body('items.*.cod_detalle_factura').isInt({ min: 1 }).withMessage('cod_detalle_factura requerido en cada ítem'),
  body('items.*.cantidad_devuelta').isInt({ min: 1 }).withMessage('cantidad_devuelta debe ser >= 1'),
  validarCampos
];
router.post('/', autorizar('Administrador', 'Cajero', 'Vendedor'), validarCrearNC, crear);

// Anular nota de crédito (solo Administrador)
router.patch('/:id/anular', autorizar('Administrador'), anular);

export default router;
