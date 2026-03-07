import { sequelize } from '../config/sequelize.js';
import { DataTypes } from 'sequelize';

const BitacoraFacturacion = sequelize.define('bitacora_facturacion', {
  cod_bitacora: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  evento: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'FACTURA_CREADA, FACTURA_ANULADA, FACTURA_ELIMINADA, EXCEPCION_STOCK, COTIZACION_CONVERTIDA, PAGO_REGISTRADO'
  },
  entidad: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'FACTURA'
  },
  cod_factura: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  cod_usuario: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  nombre_usuario: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  detalle: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Información adicional del evento en formato JSON'
  },
  ip: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  fecha: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'bitacora_facturacion',
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

export default BitacoraFacturacion;
