import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

const Rol = sequelize.define('roles', {
  cod_rol: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre_rol: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  descripcion: {
    type: DataTypes.STRING(100)
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

export default Rol;
