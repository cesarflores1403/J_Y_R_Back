import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { autenticar } from '../middlewares/auth.js';
import { validarCampos } from '../middlewares/validar.js';
import { listarExistencias, listarAlertasStockBajo, actualizarMinMax } from '../controllers/inventarioExistenciasController.js';
import { listarMovimientos } from '../controllers/inventarioMovimientosController.js';
import { registrarEntrada } from '../controllers/inventarioEntradasController.js';
import { registrarSalida } from '../controllers/inventarioSalidasController.js';
import { registrarBaja } from '../controllers/inventarioBajasController.js';
import { registrarTransferencia } from '../controllers/inventarioTransferenciasController.js';
import { abrirConteo, registrarDetalleConteo, cerrarConteo } from '../controllers/inventarioConteosController.js';
import { crearReserva, liberarReserva, consumirReserva } from '../controllers/inventarioReservasController.js';

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

// // GET /api/inventario/alertas/stock-bajo
// // Lista alertas de reposicion segun regla stock_disponible <= stock_minimo
router.get('/alertas/stock-bajo', [
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
  // // Alias legacy de paginacion: pagina
  query('pagina')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('pagina debe ser un entero mayor o igual a 1')
    .toInt(),
  // // Alias legacy de paginacion: limite
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
  // // Permite filtrar solo alertas criticas (sin stock disponible)
  query('solo_criticos')
    .optional({ values: 'falsy' })
    .isBoolean()
    .withMessage('solo_criticos debe ser true o false'),
  // // Alias camelCase para integraciones que lo utilicen
  query('soloCriticos')
    .optional({ values: 'falsy' })
    .isBoolean()
    .withMessage('soloCriticos debe ser true o false'),
  // // Ejecuta respuesta 400 si alguna validacion falla
  validarCampos
], listarAlertasStockBajo);

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
    .isIn(['ENTRADA', 'SALIDA', 'AJUSTE', 'BAJA'])
    .withMessage('tipo debe ser ENTRADA, SALIDA, AJUSTE o BAJA'),
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

// // POST /api/inventario/bajas
// // Registra una baja por dano/perdida con trazabilidad y control transaccional
router.post('/bajas', [
  // // Producto y ubicacion obligatorios para ubicar una existencia exacta
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
  // // Cantidad de baja estrictamente positiva
  body('cantidad')
    .exists()
    .withMessage('cantidad es requerida')
    .bail()
    .isInt({ min: 1 })
    .withMessage('cantidad debe ser un entero mayor a 0')
    .toInt(),
  // // Motivo opcional individualmente, pero requerido junto a descripcion por regla combinada
  body('motivo')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('motivo debe tener entre 1 y 120 caracteres'),
  // // Descripcion opcional individualmente, pero requerida junto a motivo por regla combinada
  body('descripcion')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('descripcion debe tener entre 1 y 500 caracteres'),
  // // Referencia opcional para auditoria cruzada (acta, reporte interno, etc.)
  body('referencia')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 200 })
    .withMessage('referencia no puede exceder 200 caracteres'),
  // // Regla de negocio: debe venir al menos motivo o descripcion
  body()
    .custom((_, { req }) => {
      const motivo = String(req.body?.motivo || '').trim();
      const descripcion = String(req.body?.descripcion || '').trim();
      if (!motivo && !descripcion) {
        throw new Error('motivo o descripcion es requerido');
      }
      return true;
    }),
  // // Respuesta 400 estandar si falla cualquier validacion de entrada
  validarCampos
], registrarBaja);

// // POST /api/inventario/transferencias
// // Registra transferencia entre ubicaciones con doble movimiento y transaccion real
router.post('/transferencias', [
  // // Producto obligatorio para resolver inventario origen/destino de una misma referencia
  body('cod_producto')
    .exists()
    .withMessage('cod_producto es requerido')
    .bail()
    .isInt({ min: 1 })
    .withMessage('cod_producto debe ser un entero mayor a 0')
    .toInt(),
  // // Ubicacion origen obligatoria
  body('cod_ubicacion_origen')
    .exists()
    .withMessage('cod_ubicacion_origen es requerido')
    .bail()
    .isInt({ min: 1 })
    .withMessage('cod_ubicacion_origen debe ser un entero mayor a 0')
    .toInt(),
  // // Ubicacion destino obligatoria
  body('cod_ubicacion_destino')
    .exists()
    .withMessage('cod_ubicacion_destino es requerido')
    .bail()
    .isInt({ min: 1 })
    .withMessage('cod_ubicacion_destino debe ser un entero mayor a 0')
    .toInt(),
  // // Cantidad transferida debe ser entera y positiva
  body('cantidad')
    .exists()
    .withMessage('cantidad es requerida')
    .bail()
    .isInt({ min: 1 })
    .withMessage('cantidad debe ser un entero mayor a 0')
    .toInt(),
  // // Referencia obligatoria para vincular SALIDA y ENTRADA de la transferencia
  body('referencia')
    .exists()
    .withMessage('referencia es requerida')
    .bail()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('referencia debe tener entre 1 y 200 caracteres'),
  // // Motivo opcional para contexto operativo de la transferencia
  body('motivo')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('motivo debe tener entre 1 y 120 caracteres'),
  // // Observaciones opcionales de la transferencia
  body('observaciones')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('observaciones no puede exceder 500 caracteres'),
  // // Regla de negocio: origen y destino no pueden ser iguales
  body()
    .custom((_, { req }) => {
      const codOrigen = Number(req.body?.cod_ubicacion_origen);
      const codDestino = Number(req.body?.cod_ubicacion_destino);
      if (Number.isInteger(codOrigen) && Number.isInteger(codDestino) && codOrigen === codDestino) {
        throw new Error('cod_ubicacion_origen y cod_ubicacion_destino no pueden ser iguales');
      }
      return true;
    }),
  // // Respuesta 400 estandar cuando falla cualquier validacion
  validarCampos
], registrarTransferencia);

// // POST /api/inventario/conteos
// // Abre encabezado de conteo fisico para captura posterior de detalle
router.post('/conteos', [
  // // Observaciones de apertura opcionales
  body('observaciones')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('observaciones no puede exceder 500 caracteres'),
  // // Respuesta 400 estandar de validacion
  validarCampos
], abrirConteo);

// // POST /api/inventario/conteos/:id/detalle
// // Captura o actualiza stock fisico de producto+ubicacion en conteo abierto
router.post('/conteos/:id/detalle', [
  // // Id de conteo obligatorio y valido
  param('id')
    .isInt({ min: 1 })
    .withMessage('id de conteo debe ser un entero mayor a 0')
    .toInt(),
  // // Clave producto y ubicacion para la linea del conteo fisico
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
  // // Stock fisico debe ser numerico entero >= 0
  body('stock_fisico')
    .exists()
    .withMessage('stock_fisico es requerido')
    .bail()
    .isInt({ min: 0 })
    .withMessage('stock_fisico debe ser un entero mayor o igual a 0')
    .toInt(),
  // // Observaciones opcionales de la linea de conteo
  body('observaciones')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('observaciones no puede exceder 500 caracteres'),
  // // Respuesta 400 estandar de validacion
  validarCampos
], registrarDetalleConteo);

// // POST /api/inventario/conteos/:id/cerrar
// // Cierra conteo fisico y aplica ajustes de inventario en transaccion real
router.post('/conteos/:id/cerrar', [
  // // Id de conteo obligatorio y valido
  param('id')
    .isInt({ min: 1 })
    .withMessage('id de conteo debe ser un entero mayor a 0')
    .toInt(),
  // // Observaciones de cierre opcionales
  body('observaciones_cierre')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('observaciones_cierre no puede exceder 500 caracteres'),
  // // Respuesta 400 estandar de validacion
  validarCampos
], cerrarConteo);

// // POST /api/inventario/reservas
// // Crea una reserva incrementando stock_reservado sin descontar stock total
router.post('/reservas', [
  // // Producto y ubicacion requeridos para reservar existencia puntual
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
  // // Cantidad reservada debe ser positiva
  body('cantidad')
    .exists()
    .withMessage('cantidad es requerida')
    .bail()
    .isInt({ min: 1 })
    .withMessage('cantidad debe ser un entero mayor a 0')
    .toInt(),
  // // Referencia y observaciones opcionales para trazabilidad de reserva
  body('referencia')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 200 })
    .withMessage('referencia no puede exceder 200 caracteres'),
  body('observaciones')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('observaciones no puede exceder 500 caracteres'),
  // // Respuesta 400 estandar de validacion
  validarCampos
], crearReserva);

// // POST /api/inventario/reservas/:id/liberar
// // Libera reserva activa restando stock_reservado
router.post('/reservas/:id/liberar', [
  // // Id de reserva obligatorio y valido
  param('id')
    .isInt({ min: 1 })
    .withMessage('id de reserva debe ser un entero mayor a 0')
    .toInt(),
  // // Campos de liberacion opcionales
  body('motivo')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 200 })
    .withMessage('motivo no puede exceder 200 caracteres'),
  body('observaciones')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('observaciones no puede exceder 500 caracteres'),
  // // Respuesta 400 estandar de validacion
  validarCampos
], liberarReserva);

// // POST /api/inventario/reservas/:id/consumir
// // Consume reserva activa descontando stock total y reservado
router.post('/reservas/:id/consumir', [
  // // Id de reserva obligatorio y valido
  param('id')
    .isInt({ min: 1 })
    .withMessage('id de reserva debe ser un entero mayor a 0')
    .toInt(),
  // // Referencia y observaciones opcionales para consumo y trazabilidad
  body('referencia')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 200 })
    .withMessage('referencia no puede exceder 200 caracteres'),
  body('observaciones')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('observaciones no puede exceder 500 caracteres'),
  // // Respuesta 400 estandar de validacion
  validarCampos
], consumirReserva);

export default router;
