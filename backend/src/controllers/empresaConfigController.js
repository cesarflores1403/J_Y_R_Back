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

export const obtenerCorrelativos = async (req, res) => {
  try {
    const datos = await empresaConfigService.obtenerCorrelativos();
    res.json({ ok: true, datos });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const actualizarCorrelativos = async (req, res) => {
  try {
    const datos = await empresaConfigService.actualizarCorrelativos(req.body);
    res.json({ ok: true, datos, mensaje: 'Correlativos actualizados correctamente' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const subirLogoFactura = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, mensaje: 'Debe adjuntar una imagen para el logo' });
    }

    const logoFacturaUrl = `/uploads/${req.file.filename}`;
    const config = await empresaConfigService.actualizarLogoFactura(logoFacturaUrl);
    res.json({ ok: true, datos: config, mensaje: 'Logo de factura actualizado correctamente' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const quitarLogoFactura = async (req, res) => {
  try {
    const config = await empresaConfigService.quitarLogoFactura();
    res.json({ ok: true, datos: config, mensaje: 'Logo de factura restablecido al predeterminado' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};
