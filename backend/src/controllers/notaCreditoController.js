import notaCreditoService from '../services/notaCreditoService.js';

// =====================================================
// CONTROLADOR: Notas de Crédito (HU-FAC-12)
// =====================================================

export const listar = async (req, res) => {
  try {
    const resultado = await notaCreditoService.listar(req.query);
    res.json({ ok: true, ...resultado });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
};

export const obtener = async (req, res) => {
  try {
    const nota = await notaCreditoService.obtenerPorId(req.params.id);
    res.json({ ok: true, datos: nota });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const obtenerDetallesFactura = async (req, res) => {
  try {
    const datos = await notaCreditoService.obtenerDetallesFactura(req.params.codFactura);
    res.json({ ok: true, datos });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const crear = async (req, res) => {
  try {
    const resultado = await notaCreditoService.crear(req.body, req.usuario.cod_usuario);
    res.status(201).json({ ok: true, ...resultado });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const anular = async (req, res) => {
  try {
    const resultado = await notaCreditoService.anular(req.params.id, req.usuario.cod_usuario);
    res.json({ ok: true, ...resultado });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};
