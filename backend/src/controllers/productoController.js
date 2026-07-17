import * as productoService from '../services/productoService.js'; // // Service de producto
import * as isvService from '../services/isvService.js'; // // Service ISV (validación)
import { sendOk } from '../utils/response.js'; // // Respuesta estándar (ok/message/data)

// =======================
// GET PRODUCTOS
// =======================
export const getProducto = async (req, res, next) => {
  try {
    const rolUsuario = req.usuario?.rol || '';
    const incluirAuditoria = rolUsuario === 'Administrador' || rolUsuario === 'Super Administrador';
    const data = await productoService.getProductoConAuditoria({
      incluirAuditoria,
      buscar: req.query?.buscar || ''
    }); // // Obtener productos desde service

    const dataFiltrada = rolUsuario === 'Cajero'
      ? (data || []).map((p) => {
        const sinCosto = { ...p };
        delete sinCosto.precio_costo;
        delete sinCosto.margen_ganancia;
        return sinCosto;
      })
      : data;

    return sendOk(res, {
      status: 200, // // OK
      message: 'Productos obtenidos correctamente', // // Mensaje
      data: dataFiltrada // // Lista de productos
    });
  } catch (err) {
    next(err); // // Envía al errorHandler global
  }
};

// =======================
// EXPORTAR REPORTE PDF
// =======================
export const exportarReportePdf = async (req, res, next) => {
  try {
    const rolUsuario = req.usuario?.rol || '';
    const incluirAuditoria = rolUsuario === 'Administrador' || rolUsuario === 'Super Administrador';
    const pdf = await productoService.exportarReportePdf({
      incluirAuditoria,
      buscar: req.query?.buscar || '',
      estado: req.query?.estado || ''
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte-productos.pdf"');
    return res.send(pdf);
  } catch (err) {
    next(err);
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
    const productoCreado = await productoService.createProducto(req.body, {
      cod_usuario: req.usuario?.cod_usuario || null
    });

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
    const { cod_producto, datos = {}, stock_agregar = 0, stock_nuevo = null } = req.body;

    // Si se está actualizando cod_isv, validar que exista
    if (datos.cod_isv !== undefined && datos.cod_isv !== null) {
      await isvService.validarIsvExiste(datos.cod_isv);
    }

    await productoService.updateProducto({
      cod_producto,
      datos,
      stock_agregar,
      stock_nuevo,
      auditoria: {
        cod_usuario: req.usuario?.cod_usuario || null,
        nombre_usuario: req.usuario?.nombre_usuario || null,
        ip: req.ip || null
      }
    });

    // HU-05: Mensaje detallado con campos actualizados
    const camposActualizados = Object.keys(datos);
    const stockAgregado = Number(stock_agregar || 0);
    const stockNuevoDefinido = stock_nuevo !== undefined && stock_nuevo !== null && stock_nuevo !== '';
    const stockNuevo = stockNuevoDefinido ? Number(stock_nuevo) : null;
    const nombresLegibles = {
      cod_categoria: 'Categoría',
      nombre_producto: 'Nombre',
      descripcion: 'Descripción',
      especificaciones: 'Especificaciones',
      unidad_medida: 'Unidad de medida',
      precio_venta: 'Precio de venta',
      precio_costo: 'Precio de costo',
      cod_isv: 'ISV',
      estado_producto: 'Estado',
      cod_ubicacion: 'Ubicación',
      stock_minimo: 'Stock mínimo',
      punto_reorden: 'Punto de reorden'
    };
    const camposTexto = camposActualizados.map(c => nombresLegibles[c] || c).join(', ');
    const partesMensaje = [];

    if (camposTexto) partesMensaje.push(`Campos modificados: ${camposTexto}.`);
    if (stockNuevoDefinido && Number.isInteger(stockNuevo) && stockNuevo >= 0) {
      partesMensaje.push(`Stock total actualizado a: ${stockNuevo}.`);
    }
    if (stockAgregado > 0) partesMensaje.push(`Stock agregado: +${stockAgregado}.`);

    const mensajeFinal = partesMensaje.length > 0
      ? `Producto actualizado correctamente. ${partesMensaje.join(' ')}`
      : 'Producto actualizado correctamente.';

    return sendOk(res, {
      status: 200,
      message: mensajeFinal,
      data: {
        cod_producto,
        campos_actualizados: camposActualizados,
        stock_agregado: stockAgregado,
        stock_nuevo: stockNuevoDefinido ? stockNuevo : null
      }
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

// =======================
// CAMBIAR ESTADO MASIVO PRODUCTOS (PATCH)
// =======================
export const cambiarEstadoMasivo = async (req, res, next) => {
  try {
    const { cod_productos, estado } = req.body;

    const resultado = await productoService.cambiarEstadoMasivo({
      cod_productos,
      estado,
      cod_usuario: req.usuario?.cod_usuario || null,
      nombre_usuario: req.usuario?.nombre_usuario || null,
      ip: req.ip || null
    });

    return sendOk(res, {
      status: 200,
      message: `Cambio masivo completado: ${resultado.resumen.exitos} éxito(s), ${resultado.resumen.fallos} fallo(s).`,
      data: resultado
    });
  } catch (err) {
    next(err);
  }
};

// =======================
// HU-08: SUBIR / REEMPLAZAR IMAGEN DE PRODUCTO
// =======================
export const subirImagen = async (req, res, next) => {
  try {
    const cod_producto = Number(req.params.codProducto);

    if (!cod_producto || isNaN(cod_producto) || cod_producto < 1) {
      return res.status(400).json({ ok: false, message: 'cod_producto inválido.', data: null });
    }

    if (!req.file) {
      return res.status(400).json({ ok: false, message: 'No se envió ninguna imagen.', data: null });
    }

    const imagen_url = await productoService.subirImagen(cod_producto, req.file);

    return sendOk(res, {
      status: 200,
      message: 'Imagen del producto actualizada correctamente.',
      data: { cod_producto, imagen_url }
    });
  } catch (err) {
    next(err);
  }
};

// =======================
// HU-08: ELIMINAR IMAGEN DE PRODUCTO
// =======================
export const eliminarImagen = async (req, res, next) => {
  try {
    const cod_producto = Number(req.params.codProducto);

    if (!cod_producto || isNaN(cod_producto) || cod_producto < 1) {
      return res.status(400).json({ ok: false, message: 'cod_producto inválido.', data: null });
    }

    await productoService.eliminarImagen(cod_producto);

    return sendOk(res, {
      status: 200,
      message: 'Imagen del producto eliminada correctamente.',
      data: { cod_producto }
    });
  } catch (err) {
    next(err);
  }
};
