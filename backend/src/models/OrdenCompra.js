import {DataTypes} from 'sequelize';
import {sequelize} from '../config/sequelize.js';

// Modelo Orden de Compra
const OrdenCompra=sequelize.define('orden_compra',{
  cod_orden_compra:{type:DataTypes.INTEGER,primaryKey:true,autoIncrement:true},

  // Relación con proveedor
  cod_proveedor:{type:DataTypes.INTEGER,allowNull:false},

  // Usuario que crea la orden
  cod_usuario:{type:DataTypes.INTEGER,allowNull:false},

  // Estado de la orden
  cod_estado_oc:{type:DataTypes.INTEGER,allowNull:false},

  // Fecha automática
  fecha:{type:DataTypes.DATE,defaultValue:DataTypes.NOW},

  // Moneda controlada (solo HNL o USD)
  moneda:{
    type:DataTypes.STRING(3),
    allowNull:false,
    defaultValue:'HNL',
    validate:{
      isIn:{
        args:[['HNL','USD']],
        msg:'Moneda inválida'
      }
    }
  },

  // Total de la orden
  total:{type:DataTypes.DECIMAL(10,2),defaultValue:0},

  // Observaciones opcionales
  observaciones:{type:DataTypes.STRING(200)}
},{
  timestamps:false
});

export default OrdenCompra;
