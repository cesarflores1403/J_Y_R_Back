import { Router } from 'express';
import { body } from 'express-validator';
import { autenticar, autorizar } from '../middlewares/auth.js';
import { validarCampos } from '../middlewares/validar.js';
import {
  listar, obtener, crear, anular, convertirAFactura, eliminar,
  productosDisponibles, clientesDisponibles, historialCliente
} from '../controllers/cotizacionController.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(autenticar);

// Endpoints auxiliares
router.get('/productos-disponibles', productosDisponibles);
router.get('/clientes-disponibles', clientesDisponibles);

// Historial de cotizaciones de un cliente (trazabilidad comercial)
router.get('/cliente/:codCliente', historialCliente);

// CRUD cotizaciones
router.get('/', listar);
router.get('/:id', obtener);

// Validaciones para crear cotización
const validarCrearCotizacion = [
  body('cod_cliente').isInt({ min: 1 }).withMessage('El cliente es requerido'),
  body('items').isArray({ min: 1 }).withMessage('Debe incluir al menos 1 ítem'),
  body('items.*.cod_producto').isInt({ min: 1 }).withMessage('cod_producto requerido en cada ítem'),
  body('items.*.cantidad').isInt({ min: 1 }).withMessage('Cantidad debe ser >= 1'),
  body('items.*.descuento').optional().isFloat({ min: 0 }).withMessage('El descuento no puede ser negativo'),
  body('vigencia_dias').optional().isInt({ min: 1, max: 90 }).withMessage('La vigencia debe ser entre 1 y 90 días'),
  validarCampos
];

// Administrador y Cajero pueden crear cotizaciones
router.post('/', autorizar('Administrador', 'Cajero', 'Vendedor'), validarCrearCotizacion, crear);

// Convertir cotización a factura
router.post('/:id/convertir', autorizar('Administrador', 'Cajero', 'Vendedor'), convertirAFactura);

// Anular cotización
router.patch('/:id/anular', autorizar('Administrador'), anular);

// Eliminar permanentemente
router.delete('/:id', autorizar('Administrador'), eliminar);

export default router;
