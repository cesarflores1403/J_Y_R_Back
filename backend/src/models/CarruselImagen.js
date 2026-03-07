import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

const CarruselImagen = sequelize.define('CarruselImagen', {
  cod_imagen: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  titulo: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  descripcion: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  imagen_url: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  orden: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'carrusel_imagenes',
  timestamps: false
});

export default CarruselImagen;
