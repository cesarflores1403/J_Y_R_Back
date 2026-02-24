import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { autenticar } from '../middlewares/auth.js';
import { validarCampos } from '../middlewares/validar.js';
import { listarExistencias, actualizarMinMax } from '../controllers/inventarioExistenciasController.js';

const router = Router();

// // Todas las rutas de existencias requieren autenticacion
router.use(autenticar);

// // GET /api/inventario/existencias
router.get('/existencias', [
  // // Compatibilidad: page (nuevo alias de pagina)
  query('page')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('page debe ser un entero mayor o igual a 1')
    .toInt(),
  // // Compatibilidad: limit (nuevo alias de limite)
  query('limit')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 100 })
    .withMessage('limit debe ser un entero entre 1 y 100')
    .toInt(),
  // // Filtro exacto por producto (id)
  query('cod_producto')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('cod_producto debe ser un entero mayor a 0')
    .toInt(),
  // // Filtro exacto por ubicacion (id)
  query('cod_ubicacion')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('cod_ubicacion debe ser un entero mayor a 0')
    .toInt(),
  // // Filtro textual por producto (id/nombre)
  query('producto')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('producto debe tener entre 1 y 100 caracteres'),
  // // Filtro textual por ubicacion (id/qr/detalle)
  query('ubicacion')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('ubicacion debe tener entre 1 y 100 caracteres'),
  // // Paginacion: numero de pagina
  query('pagina')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('pagina debe ser un entero mayor o igual a 1')
    .toInt(),
  // // Paginacion: limite por pagina (tope de seguridad)
  query('limite')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 100 })
    .withMessage('limite debe ser un entero entre 1 y 100')
    .toInt(),
  // // Permite incluir inactivos solo si se solicita explicitamente
  query('includeInactive')
    .optional({ values: 'falsy' })
    .isBoolean()
    .withMessage('includeInactive debe ser true o false'),
  // // Ejecuta respuesta 400 si alguna validacion falla
  validarCampos
], listarExistencias);

// // PUT /api/inventario/existencias/:id
router.put('/existencias/:id', [
  // // Id de inventario obligatorio y valido
  param('id')
    .isInt({ min: 1 })
    .withMessage('El id de inventario debe ser un entero mayor a 0')
    .toInt(),
  // // stock_minimo requerido, numerico y no negativo
  body('stock_minimo')
    .exists()
    .withMessage('stock_minimo es requerido')
    .bail()
    .isInt({ min: 0 })
    .withMessage('stock_minimo debe ser un entero mayor o igual a 0')
    .toInt(),
  // // stock_maximo requerido, numerico y no negativo
  body('stock_maximo')
    .exists()
    .withMessage('stock_maximo es requerido')
    .bail()
    .isInt({ min: 0 })
    .withMessage('stock_maximo debe ser un entero mayor o igual a 0')
    .toInt(),
  // // Si llega stock en payload, se rechaza en controller con mensaje especifico
  body('stock')
    .optional()
    .custom(() => true),
  // // Si llega stock_reservado en payload, se rechaza en controller con mensaje especifico
  body('stock_reservado')
    .optional()
    .custom(() => true),
  // // Ejecuta respuesta 400 si alguna validacion falla
  validarCampos
], actualizarMinMax);

export default router;
