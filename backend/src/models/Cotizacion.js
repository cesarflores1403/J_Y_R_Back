import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

const Cotizacion = sequelize.define('cotizacion', {
  cod_cotizacion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cod_cliente: { type: DataTypes.INTEGER, allowNull: false },
  cod_usuario: { type: DataTypes.INTEGER, allowNull: false },
  subtotal: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  descuento: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  descuento_global: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  tipo_descuento_global: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
  monto_descuento_global: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  isv: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  // Estado: VIGENTE | VENCIDA | CONVERTIDA | ANULADA
  estado_cotizacion: { type: DataTypes.TEXT, defaultValue: 'VIGENTE' },
  vigencia_dias: { type: DataTypes.INTEGER, defaultValue: 15 },
  fecha_vencimiento: { type: DataTypes.DATE, allowNull: true },
  observaciones: { type: DataTypes.TEXT, allowNull: true },
  // FK a factura cuando se convierte
  cod_factura: { type: DataTypes.INTEGER, allowNull: true },
  estado: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

export default Cotizacion;
