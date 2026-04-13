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
  descripcion: { type: DataTypes.STRING(500), allowNull: true, defaultValue: null },
  especificaciones: { type: DataTypes.JSONB, allowNull: true, defaultValue: null },
  unidad_medida: { type: DataTypes.STRING(10) },
  precio_venta: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  precio_costo: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: null },
  cod_isv: { type: DataTypes.INTEGER, allowNull: true },
  estado_producto: {
    type: DataTypes.STRING(15),
    defaultValue: 'Activo',
    allowNull: false,
    validate: {
      isIn: [['Activo', 'Inactivo', 'Descontinuado']]
    }
  },
  imagen_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    defaultValue: null
  },
  cod_ubicacion: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  },
  stock_minimo: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  },
  punto_reorden: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null
  },
  creado_por: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: true
  },
  modificado_por: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  fecha_modificacion: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

export default ProductoSeq;
