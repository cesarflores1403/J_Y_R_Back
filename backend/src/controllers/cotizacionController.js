import cotizacionService from '../services/cotizacionService.js';

export const listar = async (req, res) => {
  try {
    const resultado = await cotizacionService.listar(req.query);
    res.json({ ok: true, ...resultado });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
};

export const obtener = async (req, res) => {
  try {
    const datos = await cotizacionService.obtenerPorId(req.params.id);
    res.json({ ok: true, datos });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const crear = async (req, res) => {
  try {
    const datos = await cotizacionService.crear(req.body, req.usuario.cod_usuario);
    res.status(201).json({ ok: true, datos, mensaje: 'Cotización creada correctamente' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const anular = async (req, res) => {
  try {
    const resultado = await cotizacionService.anular(req.params.id);
    res.json({ ok: true, ...resultado });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const convertirAFactura = async (req, res) => {
  try {
    const resultado = await cotizacionService.convertirAFactura(req.params.id, req.usuario.cod_usuario);
    res.json({ ok: true, ...resultado });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const eliminar = async (req, res) => {
  try {
    const resultado = await cotizacionService.eliminar(req.params.id);
    res.json({ ok: true, ...resultado });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const productosDisponibles = async (req, res) => {
  try {
    const productos = await cotizacionService.productosDisponibles(req.query);
    res.json({ ok: true, datos: productos });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
};

export const clientesDisponibles = async (req, res) => {
  try {
    const clientes = await cotizacionService.clientesDisponibles(req.query);
    res.json({ ok: true, datos: clientes });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
};

export const historialCliente = async (req, res) => {
  try {
    const resultado = await cotizacionService.historialPorCliente(req.params.codCliente, req.query);
    res.json({ ok: true, ...resultado });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};
