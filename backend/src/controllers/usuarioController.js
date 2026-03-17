import usuarioService from '../services/usuarioService.js';

export const listar = async (req, res) => {
  try {
    const resultado = await usuarioService.listar(req.query);
    res.json({ ok: true, ...resultado });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
};

export const listarRoles = async (req, res) => {
  try {
    const roles = await usuarioService.listarRoles();
    res.json({ ok: true, datos: roles });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
};

export const crear = async (req, res) => {
  try {
    const usuario = await usuarioService.crear(req.body);
    res.status(201).json({ ok: true, datos: usuario, mensaje: 'Usuario creado correctamente' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const actualizar = async (req, res) => {
  try {
    const usuario = await usuarioService.actualizar(parseInt(req.params.id), req.body, {
      cod_usuario: req.usuario?.cod_usuario,
      rol: req.usuario?.rol
    });
    res.json({ ok: true, datos: usuario, mensaje: 'Usuario actualizado correctamente' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const toggleEstado = async (req, res) => {
  try {
    const usuario = await usuarioService.toggleEstado(parseInt(req.params.id));
    res.json({ ok: true, datos: usuario, mensaje: 'Estado actualizado' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const eliminar = async (req, res) => {
  try {
    await usuarioService.eliminar(parseInt(req.params.id));
    res.json({ ok: true, mensaje: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};