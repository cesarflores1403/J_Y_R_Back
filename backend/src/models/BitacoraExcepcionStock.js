import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

// =====================================================
// MODELO: bitacora_excepcion_stock
// HU-FAC-09: Registra ventas autorizadas sin stock suficiente
// =====================================================
const BitacoraExcepcionStock = sequelize.define('bitacora_excepcion_stock', {
  cod_excepcion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cod_factura: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  cod_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Usuario que autorizó la venta sin stock'
  },
  cod_producto: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  nombre_producto: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  stock_disponible: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  cantidad_vendida: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  deficit: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Unidades vendidas sin existencia (cantidad - stock)'
  },
  justificacion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  fecha: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

export default BitacoraExcepcionStock;
