import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

const DetalleFactura = sequelize.define('detalle_factura', {
  cod_detalle_factura: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cod_factura: { type: DataTypes.INTEGER, allowNull: false },
  tipo_item: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'PRODUCTO' },
  cod_producto: { type: DataTypes.INTEGER, allowNull: true },
  cod_servicio: { type: DataTypes.INTEGER, allowNull: true },
  cantidad: { type: DataTypes.INTEGER, allowNull: false },
  precio_unitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  tipo_descuento: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'PORCENTAJE' }, // 'PORCENTAJE' | 'MONTO'
  descuento: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  monto_descuento: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 }, // monto real descontado
  isv: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  total: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
});

export default DetalleFactura;
