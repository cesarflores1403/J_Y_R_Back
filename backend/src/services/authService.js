import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import Usuario from '../models/Usuario.js';
import Rol from '../models/Rol.js';

class AuthService {
  generarToken(usuario, nombreRol) {
    return jwt.sign(
      { id: usuario.cod_usuario, nombre: usuario.nombre_usuario, rol: nombreRol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );
  }

  async login(nombre_usuario, password) {
    const usuario = await Usuario.findOne({
      where: { nombre_usuario, estado_usuario: true },
      include: [{ model: Rol, as: 'roles', through: { attributes: [] } }]
    });

    if (!usuario) {
      throw Object.assign(new Error('Credenciales inválidas'), { statusCode: 401 });
    }

    const passwordValido = await usuario.validarPassword(password);
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

    const hash = await bcrypt.hash(passwordNuevo, 12);
    await usuario.update({ contrasena: hash, actualizado_en: new Date() });
    return { mensaje: 'Contraseña actualizada correctamente' };
  }
}

export default new AuthService();
