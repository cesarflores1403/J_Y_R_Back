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
import BitacoraAnulacion from './BitacoraAnulacion.js';
import Cotizacion from './Cotizacion.js';
import DetalleCotizacion from './DetalleCotizacion.js';
import BitacoraExcepcionStock from './BitacoraExcepcionStock.js';
import BitacoraFacturacion from './BitacoraFacturacion.js';
import NotaCredito from './NotaCredito.js';
import DetalleNotaCredito from './DetalleNotaCredito.js';
import OrdenCompra from './OrdenCompra.js';
import DetalleOrdenCompra from './DetalleOrdenCompra.js';
import Ubicacion from './Ubicacion.js';

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
Usuario.hasMany(Pago, { foreignKey: 'cod_usuario', as: 'pagos' });
Pago.belongsTo(Usuario, { foreignKey: 'cod_usuario', as: 'usuario' });

// CategoriaProducto -> Producto (HU-07)
CategoriaProducto.hasMany(ProductoSeq, { foreignKey: 'cod_categoria', as: 'productos' });
ProductoSeq.belongsTo(CategoriaProducto, { foreignKey: 'cod_categoria', as: 'categoria' });

// HU-FAC-07: BitacoraAnulacion
Factura.hasMany(BitacoraAnulacion, { foreignKey: 'cod_factura', as: 'bitacoraAnulaciones' });
BitacoraAnulacion.belongsTo(Factura, { foreignKey: 'cod_factura', as: 'factura' });
Usuario.hasMany(BitacoraAnulacion, { foreignKey: 'cod_usuario', as: 'anulaciones' });
BitacoraAnulacion.belongsTo(Usuario, { foreignKey: 'cod_usuario', as: 'usuario' });

// HU-FAC-08: Cotización
Cliente.hasMany(Cotizacion, { foreignKey: 'cod_cliente', as: 'cotizaciones' });
Cotizacion.belongsTo(Cliente, { foreignKey: 'cod_cliente', as: 'cliente' });
Usuario.hasMany(Cotizacion, { foreignKey: 'cod_usuario', as: 'cotizaciones' });
Cotizacion.belongsTo(Usuario, { foreignKey: 'cod_usuario', as: 'usuario' });
Cotizacion.hasMany(DetalleCotizacion, { foreignKey: 'cod_cotizacion', as: 'detalles' });
DetalleCotizacion.belongsTo(Cotizacion, { foreignKey: 'cod_cotizacion', as: 'cotizacion' });
ProductoSeq.hasMany(DetalleCotizacion, { foreignKey: 'cod_producto', as: 'detallesCotizacion' });
DetalleCotizacion.belongsTo(ProductoSeq, { foreignKey: 'cod_producto', as: 'producto' });
Cotizacion.belongsTo(Factura, { foreignKey: 'cod_factura', as: 'facturaGenerada' });

// HU-FAC-09: BitacoraExcepcionStock
Factura.hasMany(BitacoraExcepcionStock, { foreignKey: 'cod_factura', as: 'excepcionesStock' });
BitacoraExcepcionStock.belongsTo(Factura, { foreignKey: 'cod_factura', as: 'factura' });
Usuario.hasMany(BitacoraExcepcionStock, { foreignKey: 'cod_usuario', as: 'excepcionesStockAutorizadas' });
BitacoraExcepcionStock.belongsTo(Usuario, { foreignKey: 'cod_usuario', as: 'usuario' });
ProductoSeq.hasMany(BitacoraExcepcionStock, { foreignKey: 'cod_producto', as: 'excepcionesStock' });
BitacoraExcepcionStock.belongsTo(ProductoSeq, { foreignKey: 'cod_producto', as: 'producto' });

// HU-FAC-10: BitacoraFacturacion (auditoría general)
Factura.hasMany(BitacoraFacturacion, { foreignKey: 'cod_factura', as: 'bitacoraAcciones' });
BitacoraFacturacion.belongsTo(Factura, { foreignKey: 'cod_factura', as: 'factura' });
Usuario.hasMany(BitacoraFacturacion, { foreignKey: 'cod_usuario', as: 'accionesFacturacion' });
BitacoraFacturacion.belongsTo(Usuario, { foreignKey: 'cod_usuario', as: 'usuario' });

// HU-FAC-12: Nota de Crédito / Devolución
Factura.hasMany(NotaCredito, { foreignKey: 'cod_factura', as: 'notasCredito' });
NotaCredito.belongsTo(Factura, { foreignKey: 'cod_factura', as: 'factura' });
Usuario.hasMany(NotaCredito, { foreignKey: 'cod_usuario', as: 'notasCredito' });
NotaCredito.belongsTo(Usuario, { foreignKey: 'cod_usuario', as: 'usuario' });
NotaCredito.hasMany(DetalleNotaCredito, { foreignKey: 'cod_nota_credito', as: 'detalles' });
DetalleNotaCredito.belongsTo(NotaCredito, { foreignKey: 'cod_nota_credito', as: 'notaCredito' });
DetalleNotaCredito.belongsTo(DetalleFactura, { foreignKey: 'cod_detalle_factura', as: 'detalleFactura' });
DetalleNotaCredito.belongsTo(ProductoSeq, { foreignKey: 'cod_producto', as: 'producto' });
OrdenCompra.hasMany(DetalleOrdenCompra, { foreignKey: 'cod_orden_compra', as: 'detalles' });
DetalleOrdenCompra.belongsTo(OrdenCompra, { foreignKey: 'cod_orden_compra', as: 'orden' });

// HU-10: Ubicacion -> Producto (bodega)
Ubicacion.hasMany(ProductoSeq, { foreignKey: 'cod_ubicacion', as: 'productos' });
ProductoSeq.belongsTo(Ubicacion, { foreignKey: 'cod_ubicacion', as: 'ubicacion' });

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
  CategoriaProducto,
  BitacoraAnulacion,
  Cotizacion,
  DetalleCotizacion,
  BitacoraExcepcionStock,
  BitacoraFacturacion,
  NotaCredito,
  DetalleNotaCredito
};
