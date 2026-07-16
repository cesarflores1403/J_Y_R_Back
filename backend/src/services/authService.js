import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import Usuario from '../models/Usuario.js';
import Rol from '../models/Rol.js';
import notificacionSuperAdminService from './notificacionSuperAdminService.js';
import { assertPasswordPolicy } from '../utils/passwordPolicy.js';

const JWT_SECRET = process.env.JWT_SECRET || 'CAMBIA_ESTE_SECRET_EN_ENV';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRE || '30m';

class AuthService {
  generarToken(usuario, nombreRol) {
    return jwt.sign(
      { id: usuario.cod_usuario, nombre: usuario.nombre_usuario, rol: nombreRol },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  async login(nombre_usuario, password) {
    const usuarioNormalizado = String(nombre_usuario || '').trim();
    const passwordNormalizado = String(password || '');

    if (!usuarioNormalizado || !passwordNormalizado) {
      throw Object.assign(new Error('Credenciales inválidas'), { statusCode: 401 });
    }

    const usuario = await Usuario.findOne({
      where: {
        nombre_usuario: { [Op.iLike]: usuarioNormalizado },
        estado_usuario: true
      },
      include: [{ model: Rol, as: 'roles', through: { attributes: [] } }]
    });

    if (!usuario) {
      throw Object.assign(new Error('Credenciales inválidas'), { statusCode: 401 });
    }

    const passwordValido = await usuario.validarPassword(passwordNormalizado);
    if (!passwordValido) {
      throw Object.assign(new Error('Credenciales inválidas'), { statusCode: 401 });
    }

    const nombreRol = usuario.roles && usuario.roles.length > 0
      ? usuario.roles[0].nombre_rol
      : 'Sin rol';

    await usuario.update({ actualizado_en: new Date() });

    const token = this.generarToken(usuario, nombreRol);
    return {
      token,
      usuario: {
        cod_usuario: usuario.cod_usuario,
        nombre_usuario: usuario.nombre_usuario,
        estado_usuario: usuario.estado_usuario,
        rol: nombreRol
      }
    };
  }

  async cambiarPassword(usuarioId, passwordActual, passwordNuevo) {
    const usuario = await Usuario.findByPk(usuarioId);
    if (!usuario) {
      throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 });
    }

    const passwordValido = await usuario.validarPassword(passwordActual);
    if (!passwordValido) {
      throw Object.assign(new Error('Contraseña actual incorrecta'), { statusCode: 400 });
    }

    if (passwordNuevo === passwordActual) {
      throw Object.assign(new Error('La nueva contraseña debe ser diferente a la actual'), { statusCode: 400 });
    }

    assertPasswordPolicy(passwordNuevo, { username: usuario.nombre_usuario });

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(passwordNuevo, salt);
    await usuario.update({ contrasena: hash, actualizado_en: new Date() });
    return { mensaje: 'Contraseña actualizada correctamente' };
  }

  async solicitarRecuperacion(nombreUsuario) {
    const nombreUsuarioLimpio = (nombreUsuario || '').trim();
    
    if (!nombreUsuarioLimpio) {
      throw Object.assign(new Error('El nombre de usuario es requerido'), { statusCode: 400 });
    }

    // No se crea la solicitud si el usuario no existe.
    const usuario = await Usuario.findOne({
      where: { nombre_usuario: { [Op.iLike]: nombreUsuarioLimpio } }
    });

    if (!usuario) {
      throw Object.assign(new Error('El usuario ingresado no fue encontrado.'), { statusCode: 404 });
    }

    await notificacionSuperAdminService.crearSolicitudRecuperacion(nombreUsuarioLimpio);
    return {
      mensaje: 'Ya se ha notificado a los administradores su cambio de contraseña.'
    };
  }
}

export default new AuthService();
