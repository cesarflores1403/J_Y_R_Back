import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

const Cliente = sequelize.define('clientes', {
  cod_cliente: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  apellido: {
    type: DataTypes.STRING(50)
  },
  dni: {
    type: DataTypes.STRING(20)
  },
  empresa: {
    type: DataTypes.STRING(80)
  },
  telefono: {
    type: DataTypes.STRING(20)
  },
  correo: {
    type: DataTypes.STRING(50)
  },
  direccion: {
    type: DataTypes.STRING(200)
  }
});

export default Cliente;
