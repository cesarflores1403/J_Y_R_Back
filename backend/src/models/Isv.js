import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

// =====================================================
// MODELO: catalogo_isv
// Catálogo de tipos de ISV (impuesto sobre ventas)
// =====================================================
const Isv = sequelize.define('catalogo_isv', {
  cod_isv: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  porcentaje: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  descripcion: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

export default Isv;
