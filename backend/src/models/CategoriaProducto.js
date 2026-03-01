import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

const CategoriaProducto = sequelize.define('categoria_producto', {
  cod_categoria: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre_categoria: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  descripcion: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  estado_categoria: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

export default CategoriaProducto;
