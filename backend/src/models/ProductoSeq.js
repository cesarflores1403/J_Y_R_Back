import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

// Modelo Sequelize de Producto (para reportes y asociaciones)
// El CRUD de productos sigue usando productoModel.js con raw SQL
const ProductoSeq = sequelize.define('producto', {
  cod_producto: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cod_categoria: { type: DataTypes.INTEGER, allowNull: false },
  nombre_producto: { type: DataTypes.STRING(100), allowNull: false },
  unidad_medida: { type: DataTypes.STRING(10) },
  precio_venta: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  isv: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  estado_producto: { type: DataTypes.BOOLEAN, defaultValue: true }
});

export default ProductoSeq;
