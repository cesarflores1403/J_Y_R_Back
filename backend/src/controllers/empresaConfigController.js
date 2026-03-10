import empresaConfigService from '../services/empresaConfigService.js';

export const obtener = async (req, res) => {
  try {
    const config = await empresaConfigService.obtener();
    res.json({ ok: true, datos: config });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
};

export const actualizar = async (req, res) => {
  try {
    const config = await empresaConfigService.actualizar(req.body);
    res.json({ ok: true, datos: config, mensaje: 'Datos de empresa actualizados correctamente' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};
