import {Router} from 'express';
import {body} from 'express-validator';
import {validarCampos} from '../middlewares/validar.js';
import {autenticar} from '../middlewares/auth.js';
import {
  listar,obtener,crear,cambiarEstado,
  historial,listarEstados,eliminar,productosDisponibles,exportarReportePdf
} from '../controllers/ordenCompraController.js';

const router=Router();
router.use(autenticar);

// Rutas auxiliares
router.get('/estados',listarEstados);
router.get('/productos-disponibles',productosDisponibles);

// Rutas principales
router.get('/',listar);
router.get('/reporte/pdf',exportarReportePdf);
router.get('/:id',obtener);
router.get('/:id/historial',historial);

// Crear orden de compra
router.post('/',[
  body('cod_proveedor')
    .isInt({min:1})
    .withMessage('Proveedor requerido'),

  body('moneda')
    .notEmpty()
    .withMessage('Moneda requerida')
    .isIn(['HNL','USD'])
    .withMessage('Moneda inválida'),

  body('detalles')
    .isArray({min:1})
    .withMessage('Debe incluir al menos un producto'),

  // Validación por cada línea del detalle
  body('detalles.*.cod_producto')
    .isInt({min:1})
    .withMessage('Producto inválido'),

  body('detalles.*.cantidad')
    .isFloat({min:1})
    .withMessage('Cantidad inválida'),

  body('detalles.*.precio')
    .isFloat({min:0})
    .withMessage('Precio inválido'),

  body('detalles.*.isv')
    .optional({nullable:true})
    .isFloat({min:0})
    .withMessage('ISV inválido'),

  validarCampos
],crear);

// Cambiar estado de la orden
router.patch('/:id/estado',[
  body('cod_estado_oc')
    .isInt({min:1})
    .withMessage('Estado requerido'),
  validarCampos
],cambiarEstado);

// Eliminar orden
router.delete('/:id',eliminar);

export default router;
