import pagoService from '../services/pagoService.js';

// =====================================================
// CONTROLADOR: Pagos (HU-FAC-05)
// =====================================================

export const listarPorFactura = async (req, res) => {
  try {
    const resultado = await pagoService.listarPorFactura(req.params.codFactura);
    res.json({ ok: true, ...resultado });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const registrarPago = async (req, res) => {
  try {
    const resultado = await pagoService.registrarPago(req.body, req.usuario.cod_usuario);
    res.status(201).json({ ok: true, ...resultado, mensaje: 'Pago registrado correctamente' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const anularPago = async (req, res) => {
  try {
    const resultado = await pagoService.anularPago(req.params.codPago, req.usuario.cod_usuario);
    res.json({ ok: true, ...resultado });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};
