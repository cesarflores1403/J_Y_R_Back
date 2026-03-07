import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

// =====================================================
// MODELO: nota_credito
// HU-FAC-12: Nota de crédito / devolución asociada a factura
// =====================================================
const NotaCredito = sequelize.define('nota_credito', {
  cod_nota_credito: {
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
    allowNull: false
  },
  motivo: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  descuento: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  isv: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true // true = activa, false = anulada
  },
  devolver_inventario: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  fecha: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'nota_credito',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

export default NotaCredito;
