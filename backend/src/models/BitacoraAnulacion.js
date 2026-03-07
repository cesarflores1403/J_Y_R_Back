import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

// =====================================================
// MODELO: bitacora_anulacion
// HU-FAC-07: Bitácora de anulaciones de factura
// Guarda: usuario, fecha, motivo, factura afectada,
//         y si se reversaron pagos e inventario.
// =====================================================
const BitacoraAnulacion = sequelize.define('bitacora_anulacion', {
  cod_bitacora: {
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
    comment: 'Usuario que realizó la anulación'
  },
  motivo: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Motivo obligatorio de la anulación'
  },
  fecha_anulacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  },
  inventario_reversado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Indica si se revirtió el inventario'
  },
  pagos_reversados: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Cantidad de pagos marcados como reversados'
  },
  monto_pagos_reversados: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'Monto total de pagos reversados'
  },
  detalle_json: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Snapshot JSON de los detalles de la factura al momento de anular'
  }
});

export default BitacoraAnulacion;
