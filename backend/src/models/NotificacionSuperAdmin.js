import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

const NotificacionSuperAdmin = sequelize.define('notificaciones_super_admin', {
  cod_notificacion: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tipo: {
    type: DataTypes.STRING(40),
    allowNull: false,
    defaultValue: 'RECUPERACION_PASSWORD'
  },
  titulo: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  mensaje: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  correo_solicitante: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  leida: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  creado_en: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
});

export default NotificacionSuperAdmin;