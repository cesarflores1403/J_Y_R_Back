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
    const factura = await facturaService.crear(req.body, req.usuario.cod_usuario);
    res.status(201).json({ ok: true, datos: factura, mensaje: 'Factura creada correctamente' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const anular = async (req, res) => {
  try {
    const resultado = await facturaService.anular(req.params.id);
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
