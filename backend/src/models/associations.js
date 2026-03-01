import { sequelize } from '../config/sequelize.js';
import Usuario from './Usuario.js';
import Rol from './Rol.js';
import UsuarioRol from './UsuarioRol.js';
import Cliente from './Cliente.js';
import Proveedor from './ProveedorModel.js';
import Factura from './Factura.js';
import DetalleFactura from './DetalleFactura.js';
import ProductoSeq from './ProductoSeq.js';
import Isv from './Isv.js';
import Pago from './Pago.js';
import CategoriaProducto from './CategoriaProducto.js';

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

// Producto -> ISV (catálogo)
Isv.hasMany(ProductoSeq, { foreignKey: 'cod_isv', as: 'productos' });
ProductoSeq.belongsTo(Isv, { foreignKey: 'cod_isv', as: 'isv' });

// Factura -> Pago (HU-FAC-05)
Factura.hasMany(Pago, { foreignKey: 'cod_factura', as: 'pagos' });
Pago.belongsTo(Factura, { foreignKey: 'cod_factura', as: 'factura' });

// Pago -> Usuario (auditoría)
Usuario.hasMany(Pago, { foreignKey: 'cod_usuario', as: 'pagosRegistrados' });
Pago.belongsTo(Usuario, { foreignKey: 'cod_usuario', as: 'usuario' });

// CategoriaProducto -> Producto (HU-07)
CategoriaProducto.hasMany(ProductoSeq, { foreignKey: 'cod_categoria', as: 'productos' });
ProductoSeq.belongsTo(CategoriaProducto, { foreignKey: 'cod_categoria', as: 'categoria' });

export {
  sequelize,
  Usuario,
  Rol,
  UsuarioRol,
  Cliente,
  Proveedor,
  Factura,
  DetalleFactura,
  ProductoSeq,
  Isv,
  Pago,
  CategoriaProducto
};
