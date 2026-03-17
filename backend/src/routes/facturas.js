import { Router } from 'express';
import { body } from 'express-validator';
import { autenticar, autorizar } from '../middlewares/auth.js';
import { validarCampos } from '../middlewares/validar.js';
import { listar, obtener, crear, anular, productosDisponibles, clientesDisponibles } from '../controllers/facturaController.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(autenticar);

// Endpoints auxiliares para el formulario
router.get('/productos-disponibles', productosDisponibles);
router.get('/clientes-disponibles', clientesDisponibles);

// CRUD facturas
router.get('/', listar);
router.get('/:id', obtener);

// Validaciones para crear factura (HU-FAC-04: descuentos)
const validarCrearFactura = [
  body('cod_cliente').isInt({ min: 1 }).withMessage('El cliente es requerido'),
  body('items').isArray({ min: 1 }).withMessage('Debe incluir al menos 1 ítem'),
  body('items.*.cod_producto').isInt({ min: 1 }).withMessage('cod_producto requerido en cada ítem'),
  body('items.*.cantidad').isInt({ min: 1 }).withMessage('Cantidad debe ser >= 1'),
  body('items.*.descuento').optional().isFloat({ min: 0 }).withMessage('El descuento no puede ser negativo'),
  body('items.*.tipo_descuento').optional().isIn(['PORCENTAJE', 'MONTO']).withMessage('tipo_descuento debe ser PORCENTAJE o MONTO'),
  body('descuento_global').optional().isFloat({ min: 0 }).withMessage('El descuento global no puede ser negativo'),
  body('tipo_descuento_global').optional().isIn(['PORCENTAJE', 'MONTO']).withMessage('tipo_descuento_global debe ser PORCENTAJE o MONTO'),
  validarCampos
];

// Solo Administrador y Cajero pueden crear facturas
router.post('/', autorizar('Administrador', 'Cajero'), validarCrearFactura, crear);

// Solo Administrador puede anular (HU-FAC-07: motivo obligatorio)
const validarAnularFactura = [
  body('motivo').notEmpty().withMessage('El motivo de anulación es obligatorio'),
  validarCampos
];
router.patch('/:id/anular', autorizar('Administrador'), validarAnularFactura, anular);

export default router;
