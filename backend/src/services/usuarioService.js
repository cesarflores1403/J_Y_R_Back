import bcrypt from 'bcryptjs';
import Usuario from '../models/Usuario.js';
import Rol from '../models/Rol.js';
import UsuarioRol from '../models/UsuarioRol.js';
import { Op } from 'sequelize';
import { assertPasswordPolicy } from '../utils/passwordPolicy.js';

class UsuarioService {

  async listar({ pagina = 1, limite = 15, buscar = '' }) {
    const where = {};
    if (buscar) {
      where.nombre_usuario = { [Op.iLike]: `%${buscar}%` };
    }

    const { count, rows } = await Usuario.findAndCountAll({
      where,
      include: [{ model: Rol, as: 'roles', through: { attributes: [] } }],
      limit: parseInt(limite),
      offset: (parseInt(pagina) - 1) * parseInt(limite),
      order: [['nombre_usuario', 'ASC']]
    });

    return {
      datos: rows,
      total: count,
      pagina: parseInt(pagina),
      totalPaginas: Math.ceil(count / limite)
    };
  }

  async obtenerPorId(id) {
    const usuario = await Usuario.findByPk(id, {
      include: [{ model: Rol, as: 'roles', through: { attributes: [] } }]
    });
    if (!usuario) throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 });
    return usuario;
  }

  async listarRoles() {
    return Rol.findAll({ order: [['nombre_rol', 'ASC']] });
  }

  async crear({ nombre_usuario, contrasena, cod_rol }) {
    assertPasswordPolicy(contrasena, { username: nombre_usuario });

    const existe = await Usuario.findOne({ where: { nombre_usuario } });
    if (existe) throw Object.assign(new Error('El nombre de usuario ya está en uso'), { statusCode: 400 });

    const usuario = await Usuario.create({ nombre_usuario, contrasena });

    if (cod_rol) {
      await UsuarioRol.create({ cod_usuario: usuario.cod_usuario, cod_rol });
    }

    return this.obtenerPorId(usuario.cod_usuario);
  }

  async actualizar(id, { nombre_usuario, contrasena, cod_rol }, actor = {}) {
    const usuario = await this.obtenerPorId(id);
    const actorRol = actor?.rol;
    const actorId = Number(actor?.cod_usuario || 0);
    const esSuperAdmin = actorRol === 'Super Administrador';
    const esAdmin = actorRol === 'Administrador';
    const objetivoEsSuperAdmin = (usuario.roles || []).some((r) => r.nombre_rol === 'Super Administrador');

    if (!esSuperAdmin && !esAdmin) {
      throw Object.assign(new Error('No tienes permisos para actualizar usuarios'), { statusCode: 403 });
    }

    if (objetivoEsSuperAdmin && contrasena && contrasena.trim() !== '') {
      if (!esSuperAdmin || actorId !== Number(id)) {
        throw Object.assign(new Error('Nadie puede cambiar la contraseña del Super Administrador desde gestión de usuarios'), { statusCode: 403 });
      }
      throw Object.assign(new Error('La contraseña del Super Administrador solo puede cambiarse desde su perfil'), { statusCode: 400 });
    }

    if (esAdmin) {
      if (objetivoEsSuperAdmin) {
        throw Object.assign(new Error('No tienes permisos para modificar la cuenta Super Administrador'), { statusCode: 403 });
      }
      if (nombre_usuario !== undefined && nombre_usuario !== usuario.nombre_usuario) {
        throw Object.assign(new Error('Administrador solo puede cambiar contraseñas'), { statusCode: 403 });
      }
      if (cod_rol !== undefined) {
        throw Object.assign(new Error('Administrador no puede cambiar roles de usuario'), { statusCode: 403 });
      }

      assertPasswordPolicy(contrasena, { username: usuario.nombre_usuario });

      const salt = await bcrypt.genSalt(12);
      const hash = await bcrypt.hash(contrasena, salt);
      await usuario.update({ contrasena: hash });
      return this.obtenerPorId(id);
    }

    if (nombre_usuario && nombre_usuario !== usuario.nombre_usuario) {
      const existe = await Usuario.findOne({ where: { nombre_usuario, cod_usuario: { [Op.ne]: id } } });
      if (existe) throw Object.assign(new Error('El nombre de usuario ya está en uso'), { statusCode: 400 });
    }

    const updates = {};
    if (nombre_usuario) updates.nombre_usuario = nombre_usuario;
    if (contrasena && contrasena.trim() !== '') {
      assertPasswordPolicy(contrasena, { username: nombre_usuario || usuario.nombre_usuario });
      const salt = await bcrypt.genSalt(12);
      updates.contrasena = await bcrypt.hash(contrasena, salt);
    }

    await usuario.update(updates);

    if (cod_rol !== undefined) {
      await UsuarioRol.destroy({ where: { cod_usuario: id } });
      if (cod_rol) {
        await UsuarioRol.create({ cod_usuario: id, cod_rol });
      }
    }

    return this.obtenerPorId(id);
  }

  async toggleEstado(id) {
    const usuario = await this.obtenerPorId(id);

    const esCuentaSuperAdmin = (usuario.roles || []).some((rol) => rol.nombre_rol === 'Super Administrador');
    if (esCuentaSuperAdmin) {
      throw Object.assign(new Error('La cuenta Super Administrador no puede desactivarse'), { statusCode: 403 });
    }

    await usuario.update({ estado_usuario: !usuario.estado_usuario });
    return this.obtenerPorId(id);
  }

  async eliminar(id) {
    const usuario = await this.obtenerPorId(id);

    const esCuentaSuperAdmin = (usuario.roles || []).some((rol) => rol.nombre_rol === 'Super Administrador');
    if (esCuentaSuperAdmin) {
      throw Object.assign(new Error('La cuenta Super Administrador no puede eliminarse'), { statusCode: 403 });
    }

    await UsuarioRol.destroy({ where: { cod_usuario: id } });
    await usuario.destroy();
  }
}

export default new UsuarioService();
