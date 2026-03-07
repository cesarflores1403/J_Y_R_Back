import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

const DetalleCotizacion = sequelize.define('detalle_cotizacion', {
  cod_detalle_cotizacion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cod_cotizacion: { type: DataTypes.INTEGER, allowNull: false },
  tipo_item: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'PRODUCTO' },
  cod_producto: { type: DataTypes.INTEGER, allowNull: true },
  cantidad: { type: DataTypes.INTEGER, allowNull: false },
  precio_unitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  tipo_descuento: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'PORCENTAJE' },
  descuento: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  monto_descuento: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  isv: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  total: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
});

export default DetalleCotizacion;
