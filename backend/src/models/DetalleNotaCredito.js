import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

// =====================================================
// MODELO: detalle_nota_credito
// HU-FAC-12: Detalle de ítems devueltos en nota de crédito
// =====================================================
const DetalleNotaCredito = sequelize.define('detalle_nota_credito', {
  cod_detalle_nc: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cod_nota_credito: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  cod_detalle_factura: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  cod_producto: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  cantidad_devuelta: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  precio_unitario: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  descuento: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  isv: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  tableName: 'detalle_nota_credito',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

export default DetalleNotaCredito;
