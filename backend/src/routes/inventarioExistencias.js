import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { autenticar } from '../middlewares/auth.js';
import { validarCampos } from '../middlewares/validar.js';
import { listarExistencias, actualizarMinMax } from '../controllers/inventarioExistenciasController.js';
import { listarMovimientos } from '../controllers/inventarioMovimientosController.js';
import { registrarEntrada } from '../controllers/inventarioEntradasController.js';
import { registrarSalida } from '../controllers/inventarioSalidasController.js';

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

// // GET /api/inventario/movimientos
// // Kardex de movimientos con filtros y paginacion (HU3)
router.get('/movimientos', [
  // // Compatibilidad de paginacion con aliases usados en inventario
  query('page')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('page debe ser un entero mayor o igual a 1')
    .toInt(),
  query('limit')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 100 })
    .withMessage('limit debe ser un entero entre 1 y 100')
    .toInt(),
  query('pagina')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('pagina debe ser un entero mayor o igual a 1')
    .toInt(),
  query('limite')
    .optional({ values: 'falsy' })
    .isInt({ min: 1, max: 100 })
    .withMessage('limite debe ser un entero entre 1 y 100')
    .toInt(),
  // // Filtros por fechas para kardex
  query('fecha_desde')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('fecha_desde debe tener formato de fecha valido (YYYY-MM-DD)')
    .toDate(),
  query('fecha_hasta')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('fecha_hasta debe tener formato de fecha valido (YYYY-MM-DD)')
    .toDate(),
  // // Filtros exactos por producto y ubicacion
  query('cod_producto')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('cod_producto debe ser un entero mayor a 0')
    .toInt(),
  query('cod_ubicacion')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('cod_ubicacion debe ser un entero mayor a 0')
    .toInt(),
  // // Tipo de movimiento permitido para kardex
  query('tipo')
    .optional({ values: 'falsy' })
    .trim()
    .isIn(['ENTRADA', 'SALIDA', 'AJUSTE'])
    .withMessage('tipo debe ser ENTRADA, SALIDA o AJUSTE'),
  // // Respuesta 400 si falla cualquier validacion
  validarCampos
], listarMovimientos);

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

// // POST /api/inventario/entradas
// // Registra una entrada y actualiza inventario de forma transaccional (HU4)
router.post('/entradas', [
  // // Relacion producto-ubicacion obligatoria
  body('cod_producto')
    .exists()
    .withMessage('cod_producto es requerido')
    .bail()
    .isInt({ min: 1 })
    .withMessage('cod_producto debe ser un entero mayor a 0')
    .toInt(),
  body('cod_ubicacion')
    .exists()
    .withMessage('cod_ubicacion es requerido')
    .bail()
    .isInt({ min: 1 })
    .withMessage('cod_ubicacion debe ser un entero mayor a 0')
    .toInt(),
  // // Cantidad de entrada estrictamente positiva
  body('cantidad')
    .exists()
    .withMessage('cantidad es requerida')
    .bail()
    .isInt({ min: 1 })
    .withMessage('cantidad debe ser un entero mayor a 0')
    .toInt(),
  // // Referencia del documento de entrada para trazabilidad en kardex
  body('referencia_documento')
    .exists()
    .withMessage('referencia_documento es requerida')
    .bail()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('referencia_documento debe tener entre 1 y 200 caracteres'),
  // // Observaciones opcionales si el schema de movimientos las soporta
  body('observaciones')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('observaciones no puede exceder 500 caracteres'),
  // // Respuesta 400 si falla cualquier validacion
  validarCampos
], registrarEntrada);

// // POST /api/inventario/salidas
// // Registra una salida de inventario por venta confirmada con validacion de payload
router.post('/salidas', [
  // // Relacion producto-ubicacion obligatoria para resolver una existencia exacta
  body('cod_producto')
    .exists()
    .withMessage('cod_producto es requerido')
    .bail()
    .isInt({ min: 1 })
    .withMessage('cod_producto debe ser un entero mayor a 0')
    .toInt(),
  body('cod_ubicacion')
    .exists()
    .withMessage('cod_ubicacion es requerido')
    .bail()
    .isInt({ min: 1 })
    .withMessage('cod_ubicacion debe ser un entero mayor a 0')
    .toInt(),
  // // Cantidad de salida estrictamente positiva para evitar descuentos invalidos
  body('cantidad')
    .exists()
    .withMessage('cantidad es requerida')
    .bail()
    .isInt({ min: 1 })
    .withMessage('cantidad debe ser un entero mayor a 0')
    .toInt(),
  // // Referencia de venta/documento requerida para trazabilidad en kardex
  body('referencia')
    .exists()
    .withMessage('referencia es requerida')
    .bail()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('referencia debe tener entre 1 y 200 caracteres'),
  // // Observaciones opcionales con limite para proteger almacenamiento y payload
  body('observaciones')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('observaciones no puede exceder 500 caracteres'),
  // // Respuesta 400 estandar si falla cualquier validacion de entrada
  validarCampos
], registrarSalida);

export default router;
