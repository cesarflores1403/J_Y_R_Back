import * as productoService from '../services/productoService.js'; // // Service de producto
import * as isvService from '../services/isvService.js'; // // Service ISV (validación)
import { sendOk } from '../utils/response.js'; // // Respuesta estándar (ok/message/data)

// =======================
// GET PRODUCTOS
// =======================
export const getProducto = async (req, res, next) => {
  try {
    const data = await productoService.getProducto(); // // Obtener productos desde service

    return sendOk(res, {
      status: 200, // // OK
      message: 'Productos obtenidos correctamente', // // Mensaje
      data // // Lista de productos
    });
  } catch (err) {
    next(err); // // Envía al errorHandler global
  }
};

// =======================
// CREATE PRODUCTO (HU-04: retorna producto con cod_producto asignado)
// =======================
export const createProducto = async (req, res, next) => {
  try {
    // ISV validado en validator, existencia verificada aquí
    if (req.body.cod_isv !== undefined && req.body.cod_isv !== null) {
      await isvService.validarIsvExiste(req.body.cod_isv);
    }

    // HU-04: createProducto retorna el producto insertado con cod_producto
    const productoCreado = await productoService.createProducto(req.body);

    return sendOk(res, {
      status: 201,
      message: productoCreado
        ? `Producto creado exitosamente. Código asignado: ${productoCreado.cod_producto}`
        : 'Producto creado exitosamente.',
      data: productoCreado
    });
  } catch (err) {
    next(err);
  }
};

// =======================
// UPDATE PRODUCTO (HU-05: múltiples campos + mensaje detallado)
// =======================
export const updateProducto = async (req, res, next) => {
  try {
    const { cod_producto, datos } = req.body;

    // Si se está actualizando cod_isv, validar que exista
    if (datos.cod_isv !== undefined && datos.cod_isv !== null) {
      await isvService.validarIsvExiste(datos.cod_isv);
    }

    await productoService.updateProducto({ cod_producto, datos });

    // HU-05: Mensaje detallado con campos actualizados
    const camposActualizados = Object.keys(datos);
    const nombresLegibles = {
      cod_categoria: 'Categoría',
      nombre_producto: 'Nombre',
      unidad_medida: 'Unidad de medida',
      precio_venta: 'Precio de venta',
      cod_isv: 'ISV',
      estado_producto: 'Estado'
    };
    const camposTexto = camposActualizados.map(c => nombresLegibles[c] || c).join(', ');

    return sendOk(res, {
      status: 200,
      message: `Producto actualizado correctamente. Campos modificados: ${camposTexto}.`,
      data: { cod_producto, campos_actualizados: camposActualizados }
    });
  } catch (err) {
    next(err);
  }
};

// =======================
// DELETE PRODUCTO
// =======================
export const deleteProducto = async (req, res, next) => {
  try {
    const { cod_producto } = req.body;

    await productoService.deleteProducto(cod_producto);

    return sendOk(res, {
      status: 200,
      message: 'Producto eliminado.',
      data: null
    });
  } catch (err) {
    next(err);
  }
};

// =======================
// CAMBIAR ESTADO PRODUCTO (PATCH)
// =======================
export const cambiarEstado = async (req, res, next) => {
  try {
    const { cod_producto, estado } = req.body;

    await productoService.cambiarEstado(cod_producto, estado);

    const mensajes = {
      Activo: 'Producto activado correctamente.',
      Inactivo: 'Producto inactivado. Ya no estará disponible para venta.',
      Descontinuado: 'Producto marcado como descontinuado.'
    };

    return sendOk(res, {
      status: 200,
      message: mensajes[estado] || 'Estado actualizado.',
      data: { cod_producto, estado }
    });
  } catch (err) {
    next(err);
  }
};