import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

const Proveedor = sequelize.define('proveedor', {
  cod_proveedor: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre_proveedor: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  telefono: {
    type: DataTypes.STRING(20)
  },
  correo: {
    type: DataTypes.STRING(100)
  },
  pais: {
    type: DataTypes.STRING(50)
  },
  es_internacional: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  validado: {
    type: DataTypes.STRING(100)
  },
  estado_proveedor: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

export default Proveedor;
