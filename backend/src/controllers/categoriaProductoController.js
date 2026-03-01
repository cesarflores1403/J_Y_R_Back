import categoriaProductoService from '../services/categoriaProductoService.js';

export const listar = async (req, res) => {
  try {
    const resultado = await categoriaProductoService.listar(req.query);
    res.json({ ok: true, ...resultado });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
};

export const listarActivas = async (req, res) => {
  try {
    const datos = await categoriaProductoService.listarActivas();
    res.json({ ok: true, message: 'Categorías activas', data: datos });
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message, data: null });
  }
};

export const obtener = async (req, res) => {
  try {
    const categoria = await categoriaProductoService.obtenerPorId(req.params.id);
    res.json({ ok: true, datos: categoria });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const crear = async (req, res) => {
  try {
    const categoria = await categoriaProductoService.crear(req.body);
    res.status(201).json({ ok: true, datos: categoria, mensaje: 'Categoría creada correctamente' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const actualizar = async (req, res) => {
  try {
    const categoria = await categoriaProductoService.actualizar(req.params.id, req.body);
    res.json({ ok: true, datos: categoria, mensaje: 'Categoría actualizada correctamente' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const toggleEstado = async (req, res) => {
  try {
    const categoria = await categoriaProductoService.toggleEstado(req.params.id);
    res.json({ ok: true, datos: categoria, mensaje: 'Estado actualizado' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const eliminar = async (req, res) => {
  try {
    const resultado = await categoriaProductoService.eliminar(req.params.id);
    res.json({ ok: true, mensaje: resultado.mensaje });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};
