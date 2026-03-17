import reporteService from '../services/reporteService.js';

export const dashboard = async (req, res) => {
  try {
    const datos = await reporteService.dashboard();
    res.json({ ok: true, datos });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
};

export const ventas = async (req, res) => {
  try {
    const datos = await reporteService.ventas(req.query?.periodo);
    res.json({ ok: true, datos });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
};

export const productosVendidos = async (req, res) => {
  try {
    const datos = await reporteService.productosVendidos();
    res.json({ ok: true, datos });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
};

export const inventario = async (req, res) => {
  try {
    const datos = await reporteService.inventario();
    res.json({ ok: true, datos });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
};
