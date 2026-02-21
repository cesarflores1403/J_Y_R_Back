import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

const Ubicacion = sequelize.define('ubicacion', {
  cod_ubicacion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  pasillo: {
    type: DataTypes.STRING(80),
    allowNull: true
  },
  estanteria: {
    type: DataTypes.STRING(80),
    allowNull: true
  },
  nivel_1: {
    type: DataTypes.STRING(80),
    allowNull: true
  },
  nivel_2: {
    type: DataTypes.STRING(80),
    allowNull: true
  },
  codigo_qr: {
    type: DataTypes.STRING(120),
    allowNull: true
  },
  descripcion: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  estado_ubi: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: 'ACTIVA'
  }
});

export default Ubicacion;
