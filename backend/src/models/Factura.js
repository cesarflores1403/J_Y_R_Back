import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

const Factura = sequelize.define('factura', {
  cod_factura: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cod_cliente: { type: DataTypes.INTEGER, allowNull: false },
  cod_usuario: { type: DataTypes.INTEGER, allowNull: false },
  metodo_pago: { type: DataTypes.INTEGER },
  ref_pago: { type: DataTypes.STRING(200) },
  subtotal: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  descuento: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  descuento_global: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  tipo_descuento_global: { type: DataTypes.TEXT, allowNull: true, defaultValue: null }, // 'PORCENTAJE' | 'MONTO' | null
  monto_descuento_global: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 }, // monto real descontado global
  descuento_aplicado_por: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null }, // FK usuario auditoría
  isv: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  estado_pago: { type: DataTypes.TEXT, defaultValue: 'PENDIENTE' }, // PENDIENTE | PARCIAL | PAGADA
  total_pagado: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  saldo: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  estado: { type: DataTypes.BOOLEAN, defaultValue: true },
  creado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  actualizado_en: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  // --- Campos legales y presentación ---
  cai: { type: DataTypes.STRING(50), allowNull: true },
  rango_autorizado: { type: DataTypes.STRING(100), allowNull: true },
  fecha_limite_emision: { type: DataTypes.DATE, allowNull: true },
  valor_en_letras: { type: DataTypes.STRING(300), allowNull: true },
  observaciones: { type: DataTypes.STRING(300), allowNull: true },
  garantia_filtracion_agua: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: null },
  firma: { type: DataTypes.STRING(100), allowNull: true },
  // --- HU-FAC-07: Campos de anulación ---
  motivo_anulacion: { type: DataTypes.TEXT, allowNull: true },
  anulada_por: { type: DataTypes.INTEGER, allowNull: true },
  fecha_anulacion: { type: DataTypes.DATE, allowNull: true }
});

export default Factura;
