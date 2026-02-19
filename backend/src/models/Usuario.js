import { DataTypes } from 'sequelize';
import bcrypt from 'bcryptjs';
import { sequelize } from '../config/sequelize.js';

const Usuario = sequelize.define('usuarios', {
  cod_usuario: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre_usuario: {
    type: DataTypes.STRING(80),
    allowNull: false
  },
  contrasena: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  estado_usuario: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  creado_en: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  actualizado_en: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

// Hash de contraseña antes de crear
Usuario.beforeCreate(async (usuario) => {
  if (usuario.contrasena) {
    usuario.contrasena = await bcrypt.hash(usuario.contrasena, 12);
  }
});

// Método para validar contraseña
Usuario.prototype.validarPassword = async function (password) {
  return bcrypt.compare(password, this.contrasena);
};

// No devolver contraseña en JSON
Usuario.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.contrasena;
  return values;
};

export default Usuario;
