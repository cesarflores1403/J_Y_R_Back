import { sequelize } from '../config/sequelize.js';
import Usuario from './Usuario.js';
import Rol from './Rol.js';
import UsuarioRol from './UsuarioRol.js';
import Cliente from './Cliente.js';
import Proveedor from './ProveedorModel.js';
import Factura from './Factura.js';
import DetalleFactura from './DetalleFactura.js';
import ProductoSeq from './ProductoSeq.js';

// =============================================
// RELACIONES
// =============================================

// Usuario <-> Rol (muchos a muchos via usuarios_rol)
Usuario.belongsToMany(Rol, {
  through: UsuarioRol,
  foreignKey: 'cod_usuario',
  otherKey: 'cod_rol',
  as: 'roles'
});
Rol.belongsToMany(Usuario, {
  through: UsuarioRol,
  foreignKey: 'cod_rol',
  otherKey: 'cod_usuario',
  as: 'usuarios'
});

// Factura -> Cliente
Cliente.hasMany(Factura, { foreignKey: 'cod_cliente', as: 'facturas' });
Factura.belongsTo(Cliente, { foreignKey: 'cod_cliente', as: 'cliente' });

// Factura -> Usuario
Usuario.hasMany(Factura, { foreignKey: 'cod_usuario', as: 'facturas' });
Factura.belongsTo(Usuario, { foreignKey: 'cod_usuario', as: 'usuario' });

// Factura -> DetalleFactura
Factura.hasMany(DetalleFactura, { foreignKey: 'cod_factura', as: 'detalles' });
DetalleFactura.belongsTo(Factura, { foreignKey: 'cod_factura', as: 'factura' });

// DetalleFactura -> Producto
ProductoSeq.hasMany(DetalleFactura, { foreignKey: 'cod_producto', as: 'detallesFactura' });
DetalleFactura.belongsTo(ProductoSeq, { foreignKey: 'cod_producto', as: 'producto' });

export {
  sequelize,
  Usuario,
  Rol,
  UsuarioRol,
  Cliente,
  Proveedor,
  Factura,
  DetalleFactura,
  ProductoSeq
};
