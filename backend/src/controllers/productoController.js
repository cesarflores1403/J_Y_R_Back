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
// CREATE PRODUCTO
// =======================
export const createProducto = async (req, res, next) => {
  try {
    // // Validar que el ISV exista si se envía cod_isv
    if (req.body.cod_isv !== undefined && req.body.cod_isv !== null) {
      await isvService.validarIsvExiste(req.body.cod_isv);
    }

    await productoService.createProducto(req.body); // // Crear producto

    return sendOk(res, {
      status: 201, // // Created
      message: 'Producto creado exitosamente.', // // Mensaje
      data: null // // Consistencia
    });
  } catch (err) {
    next(err); // // Envía al errorHandler global
  }
};

// =======================
// UPDATE PRODUCTO
// =======================
export const updateProducto = async (req, res, next) => {
  try {
    const { cod_producto, datos } = req.body; // // cod_producto = PK, datos = campos a actualizar

    // // Validaciones mínimas (formato) - lo fuerte luego lo pasamos a validator
    if (cod_producto === undefined || cod_producto === null) {
      const error = new Error('cod_producto es obligatorio'); // // Error
      error.status = 400; // // Bad Request
      return next(error); // // Envía al errorHandler global
    }

    if (!datos || typeof datos !== 'object' || Array.isArray(datos) || Object.keys(datos).length === 0) {
      const error = new Error('datos debe ser un objeto con campos a actualizar'); // // Error
      error.status = 400; // // Bad Request
      return next(error); // // Envía al errorHandler global
    }

    // // Si se está actualizando cod_isv, validar que exista
    if (datos.cod_isv !== undefined && datos.cod_isv !== null) {
      await isvService.validarIsvExiste(datos.cod_isv);
    }

    await productoService.updateProducto({ cod_producto, datos }); // // Actualizar producto

    return sendOk(res, {
      status: 200, // // OK
      message: 'Producto actualizado correctamente.', // // Mensaje
      data: null // // Consistencia
    });
  } catch (err) {
    next(err); // // Envía al errorHandler global
  }
};

// =======================
// DELETE PRODUCTO
// =======================
export const deleteProducto = async (req, res, next) => {
  try {
    const { cod_producto } = req.body; // // PK a eliminar

    // // Validación mínima
    if (cod_producto === undefined || cod_producto === null) {
      const error = new Error('cod_producto es obligatorio para eliminar'); // // Error
      error.status = 400; // // Bad Request
      return next(error); // // Envía al errorHandler global
    }

    await productoService.deleteProducto(cod_producto); // // Eliminar producto

    return sendOk(res, {
      status: 200, // // OK
      message: 'Producto eliminado.', // // Mensaje
      data: null // // Consistencia
    });
  } catch (err) {
    next(err); // // Envía al errorHandler global
  }
};