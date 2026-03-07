import clienteService from '../services/clienteService.js';

export const listar = async (req, res) => {
  try {
    const resultado = await clienteService.listar(req.query);
    res.json({ ok: true, ...resultado });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
};

export const obtener = async (req, res) => {
  try {
    const cliente = await clienteService.obtenerPorId(req.params.id);
    res.json({ ok: true, datos: cliente });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const crear = async (req, res) => {
  try {
    const cliente = await clienteService.crear(req.body);
    res.status(201).json({ ok: true, datos: cliente, mensaje: 'Cliente creado correctamente' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const actualizar = async (req, res) => {
  try {
    const cliente = await clienteService.actualizar(req.params.id, req.body);
    res.json({ ok: true, datos: cliente, mensaje: 'Cliente actualizado correctamente' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const eliminar = async (req, res) => {
  try {
    const resultado = await clienteService.eliminar(req.params.id);
    res.json({ ok: true, ...resultado });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const verificarDuplicado = async (req, res) => {
  try {
    const resultado = await clienteService.verificarDuplicado(req.query);
    res.json({ ok: true, datos: resultado });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
};
