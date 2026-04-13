import {DataTypes} from 'sequelize';
import {sequelize} from '../config/sequelize.js';

// Modelo Proveedor
const Proveedor=sequelize.define('proveedor',{
  cod_proveedor:{type:DataTypes.INTEGER,primaryKey:true,autoIncrement:true},

  // Nombre obligatorio
  nombre_proveedor:{type:DataTypes.STRING(100),allowNull:false},

  // Teléfono opcional
  telefono:{type:DataTypes.STRING(20)},

  // Correo con validación de formato
  correo:{
    type:DataTypes.STRING(100),
    validate:{
      is:{
        args:/^[a-zA-Z0-9]+([._]?[a-zA-Z0-9]+)*@[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)+$/,
        msg:'Correo inválido'
      }
    }
  },

  // País opcional
  pais:{type:DataTypes.STRING(50)},

  // Indica si es internacional
  es_internacional:{type:DataTypes.BOOLEAN,defaultValue:false},

  // Campo libre de validación
  validado:{type:DataTypes.STRING(100)},

  // Estado activo/inactivo
  estado_proveedor:{type:DataTypes.BOOLEAN,defaultValue:true}
});

export default Proveedor;
