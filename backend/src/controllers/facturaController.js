import facturaService from '../services/facturaService.js';

export const listar = async (req, res) => {
  try {
    const resultado = await facturaService.listar(req.query);
    res.json({ ok: true, ...resultado });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
};

export const obtener = async (req, res) => {
  try {
    const factura = await facturaService.obtenerPorId(req.params.id);
    res.json({ ok: true, datos: factura });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const crear = async (req, res) => {
  try {
    // HU-FAC-09: Pasar rol y opciones de forzar stock
    const opciones = {
      rol: req.usuario.rol,
      forzar_sin_stock: req.body.forzar_sin_stock || false,
      justificacion_stock: req.body.justificacion_stock || ''
    };
    const factura = await facturaService.crear(req.body, req.usuario.cod_usuario, opciones);
    res.status(201).json({ ok: true, datos: factura, mensaje: 'Factura creada correctamente' });
  } catch (error) {
    // HU-FAC-09: Error especial con datos de stock
    if (error.codigo === 'STOCK_INSUFICIENTE') {
      return res.status(409).json({
        ok: false,
        codigo: error.codigo,
        mensaje: error.message,
        productos: error.productos,
        puede_forzar: error.puede_forzar
      });
    }
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const anular = async (req, res) => {
  try {
    const { motivo } = req.body || {};
    const cod_usuario = req.usuario?.cod_usuario;
    const resultado = await facturaService.anular(req.params.id, { motivo, cod_usuario });
    res.json({ ok: true, ...resultado });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const eliminar = async (req, res) => {
  try {
    const resultado = await facturaService.eliminar(req.params.id);
    res.json({ ok: true, ...resultado });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const productosDisponibles = async (req, res) => {
  try {
    const productos = await facturaService.productosDisponibles(req.query);
    res.json({ ok: true, datos: productos });
  } catch (error) {
    console.error('❌ ERROR productosDisponibles:', error.message, error.stack);
    res.status(500).json({ ok: false, mensaje: error.message });
  }
};

export const clientesDisponibles = async (req, res) => {
  try {
    const clientes = await facturaService.clientesDisponibles(req.query);
    res.json({ ok: true, datos: clientes });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
};
