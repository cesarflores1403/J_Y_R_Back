import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

const DetalleOrdenCompra = sequelize.define('detalles_orden_compra', {
  cod_detalle_oc: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cod_orden_compra: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  cod_producto: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  cantidad: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  precio: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  isv: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  }
}, {
  timestamps: false
});

export default DetalleOrdenCompra;