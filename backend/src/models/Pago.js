import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

// =====================================================
// MODELO: pago
// HU-FAC-05: Registrar pagos (incluye pagos parciales)
// =====================================================
const Pago = sequelize.define('pago', {
  cod_pago: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cod_factura: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  monto: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  metodo_pago: {
    type: DataTypes.INTEGER,
    allowNull: false,
    // 1 = Efectivo, 2 = Tarjeta, 3 = Transferencia
  },
  ref_pago: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  fecha_pago: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  observacion: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true // true = activo, false = anulado
  },
  cod_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false // usuario que registró el pago (auditoría)
  }
});

export default Pago;
