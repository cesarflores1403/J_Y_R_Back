import proveedorService from '../services/proveedorService.js';

export const listar = async (req, res) => {
  try {
    const resultado = await proveedorService.listar(req.query);
    res.json({ ok: true, ...resultado });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
};

export const exportarReportePdf = async (req, res) => {
  try {
    const pdf = await proveedorService.exportarReportePdf(req.query);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte-proveedores.pdf"');
    res.send(pdf);
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
};

export const obtener = async (req, res) => {
  try {
    const proveedor = await proveedorService.obtenerPorId(req.params.id);
    res.json({ ok: true, datos: proveedor });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const crear = async (req, res) => {
  try {
    const proveedor = await proveedorService.crear(req.body);
    res.status(201).json({ ok: true, datos: proveedor, mensaje: 'Proveedor creado correctamente' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const actualizar = async (req, res) => {
  try {
    const proveedor = await proveedorService.actualizar(req.params.id, req.body);
    res.json({ ok: true, datos: proveedor, mensaje: 'Proveedor actualizado correctamente' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const toggleEstado = async (req, res) => {
  try {
    const proveedor = await proveedorService.toggleEstado(req.params.id);
    res.json({ ok: true, datos: proveedor, mensaje: 'Estado actualizado' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const eliminar = async (req, res) => {
  try {
    const resultado = await proveedorService.eliminar(req.params.id);
    if (resultado?.accion === 'desactivado') {
      return res.json({
        ok: true,
        softDelete: true,
        datos: resultado.proveedor,
        mensaje: 'El proveedor tiene historial asociado; se desactivó en lugar de eliminarse.'
      });
    }
    res.json({ ok: true, mensaje: 'Proveedor eliminado correctamente' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};
