import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

const CatEstadoOrdenCompra = sequelize.define('cat_estado_orden_compra', {
  cod_estado_oc: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  orden: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  activo: {
    type: DataTypes.SMALLINT,
    defaultValue: 1
  }
}, {
  timestamps: false
});

export default CatEstadoOrdenCompra;