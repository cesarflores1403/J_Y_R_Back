import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

const UsuarioRol = sequelize.define('usuarios_rol', {
  cod_usuario: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  cod_rol: {
    type: DataTypes.INTEGER,
    primaryKey: true
  },
  fecha_asignacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  estado: {
    type: DataTypes.SMALLINT,
    defaultValue: 1
  }
});

export default UsuarioRol;
