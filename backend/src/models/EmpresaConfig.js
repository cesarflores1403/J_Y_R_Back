import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

const EmpresaConfig = sequelize.define('empresa_config', {
  cod_config: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  rtn: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  direccion: {
    type: DataTypes.STRING(300),
    allowNull: false
  },
  telefono: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  correo: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  cai: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  rango_autorizado: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  fecha_limite_emision: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  propietaria: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  garantia: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  logo_factura_url: {
    type: DataTypes.STRING(300),
    allowNull: true
  },
  actualizado_en: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

export default EmpresaConfig;
