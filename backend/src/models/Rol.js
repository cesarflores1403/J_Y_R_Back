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

Rol.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.fecha_creacion;
  return values;
};

export default Rol;
