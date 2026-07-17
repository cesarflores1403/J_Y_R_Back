import { Router } from 'express';
import { body } from 'express-validator';
import { autenticar, autorizar } from '../middlewares/auth.js';
import { validarCampos } from '../middlewares/validar.js';
import { listar, obtener, crear, anular, productosDisponibles, clientesDisponibles } from '../controllers/facturaController.js';
import { validarMotivoAnulacion } from '../utils/motivoAnulacion.js';

const router = Router();
const SOLO_LETRAS_ESPACIOS_REGEX = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]+$/;

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
  body('tipo_factura').optional().isIn(['PRODUCTOS', 'REPARACION']).withMessage('tipo_factura debe ser PRODUCTOS o REPARACION'),
  body('items').isArray({ min: 1 }).withMessage('Debe incluir al menos 1 ítem'),
  body('items').custom((items) => {
    let contieneProducto = false;
    let contieneReparacion = false;

    for (const item of items) {
      const tipo = String(item?.tipo_item || 'PRODUCTO').toUpperCase();
      if (!['PRODUCTO', 'REPARACION'].includes(tipo)) {
        throw new Error('tipo_item debe ser PRODUCTO o REPARACION');
      }

      if (tipo === 'PRODUCTO') contieneProducto = true;
      if (tipo === 'REPARACION') contieneReparacion = true;

      const cantidad = parseInt(item?.cantidad, 10);
      if (!Number.isInteger(cantidad) || cantidad < 1) {
        throw new Error('Cantidad debe ser >= 1 en cada ítem');
      }

      if (item?.descuento !== undefined && Number(item.descuento) < 0) {
        throw new Error('El descuento no puede ser negativo');
      }

      if (item?.tipo_descuento && !['PORCENTAJE', 'MONTO'].includes(String(item.tipo_descuento).toUpperCase())) {
        throw new Error('tipo_descuento debe ser PORCENTAJE o MONTO');
      }

      if (tipo === 'PRODUCTO') {
        const codProducto = parseInt(item?.cod_producto, 10);
        if (!Number.isInteger(codProducto) || codProducto < 1) {
          throw new Error('cod_producto requerido en ítems de tipo PRODUCTO');
        }
      }

      if (tipo === 'REPARACION') {
        const descripcion = String(item?.descripcion_item || '').trim().replace(/\s+/g, ' ');
        const precioUnitario = Number(item?.precio_unitario);
        if (!descripcion) {
          throw new Error('descripcion_item es requerida en ítems de REPARACION');
        }
        if (!SOLO_LETRAS_ESPACIOS_REGEX.test(descripcion)) {
          throw new Error('descripcion_item solo permite letras y espacios en ítems de REPARACION');
        }
        if (!Number.isFinite(precioUnitario) || precioUnitario <= 0) {
          throw new Error('precio_unitario debe ser mayor a 0 en ítems de REPARACION');
        }
      }
    }

    if (contieneProducto && contieneReparacion) {
      throw new Error('No se permite mezclar ítems PRODUCTO y REPARACION en la misma factura');
    }

    return true;
  }),
  body('items').custom((items, { req }) => {
    const tipoFactura = String(req.body?.tipo_factura || '').toUpperCase();
    if (!tipoFactura) return true;

    const hayReparacion = items.some((item) => String(item?.tipo_item || 'PRODUCTO').toUpperCase() === 'REPARACION');
    const hayProducto = items.some((item) => String(item?.tipo_item || 'PRODUCTO').toUpperCase() === 'PRODUCTO');

    if (tipoFactura === 'REPARACION' && hayProducto) {
      throw new Error('La factura de REPARACION no permite ítems de PRODUCTO');
    }
    if (tipoFactura === 'PRODUCTOS' && hayReparacion) {
      throw new Error('La factura de PRODUCTOS no permite ítems de REPARACION');
    }

    return true;
  }),
  body('descuento_global').optional().isFloat({ min: 0 }).withMessage('El descuento global no puede ser negativo'),
  body('tipo_descuento_global').optional().isIn(['PORCENTAJE', 'MONTO']).withMessage('tipo_descuento_global debe ser PORCENTAJE o MONTO'),
  validarCampos
];

// Solo Administrador y Cajero pueden crear facturas
router.post('/', autorizar('Administrador', 'Cajero'), validarCrearFactura, crear);

// Solo Administrador puede anular (HU-FAC-07: motivo obligatorio)
const validarAnularFactura = [
  body('motivo').custom((value) => {
    const resultado = validarMotivoAnulacion(value);
    if (!resultado.valido) {
      throw new Error(resultado.motivo);
    }
    return true;
  }),
  validarCampos
];
router.patch('/:id/anular', autorizar('Administrador'), validarAnularFactura, anular);

export default router;
