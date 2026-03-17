import { DataTypes } from 'sequelize';
import { sequelize } from '../config/sequelize.js';

const NotificacionSuperAdminLeida = sequelize.define('notificaciones_super_admin_leidas', {
  cod_notificacion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  },
  cod_usuario: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  },
  leida_en: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: false
});

export default NotificacionSuperAdminLeida;
