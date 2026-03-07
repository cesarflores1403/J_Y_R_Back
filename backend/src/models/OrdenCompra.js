import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

const OrdenCompra = sequelize.define('orden_compra', {
  cod_orden_compra: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cod_proveedor: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  cod_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  cod_estado_oc: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  fecha: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  moneda: {
    type: DataTypes.STRING(3),
    defaultValue: 'HNL'
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  observaciones: {
    type: DataTypes.STRING(200)
  }
}, {
  timestamps: false
});

export default OrdenCompra;