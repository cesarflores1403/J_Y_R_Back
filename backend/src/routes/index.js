import express from 'express';
import productoRoutes from './productos.js';
import authRoutes from './auth.js';
import clientesRoutes from './clientes.js';
import proveedoresRoutes from './proveedores.js';
import reportesRoutes from './reportes.js';
import facturasRoutes from './facturas.js';
import isvRoutes from './isv.js';
import ubicacionesRoutes from './ubicaciones.js';
import inventarioExistenciasRoutes from './inventarioExistencias.js';
import pagosRoutes from './pagos.js';
import categoriasRoutes from './categorias.js';
import carruselRoutes from './carrusel.js';
import cotizacionesRoutes from './cotizaciones.js';
import bitacoraFacturacionRoutes from './bitacoraFacturacion.js';
import notasCreditoRoutes from './notasCredito.js';
import usuariosRoutes from './usuarios.js';
import ordenesCompraRoutes from './ordenesCompra.js';
import empresaConfigRoutes from './empresaConfig.js';
import notificacionesSuperAdminRoutes from './notificacionesSuperAdmin.js';

const router = express.Router();

router.use('/categorias', categoriasRoutes);
router.use('/producto', productoRoutes);
router.use('/auth', authRoutes);
router.use('/clientes', clientesRoutes);
router.use('/proveedores', proveedoresRoutes);
router.use('/reportes', reportesRoutes);
router.use('/facturas', facturasRoutes);
router.use('/isv', isvRoutes);
router.use('/ubicaciones', ubicacionesRoutes);
router.use('/inventario', inventarioExistenciasRoutes);
router.use('/pagos', pagosRoutes);
router.use('/carrusel', carruselRoutes);
router.use('/cotizaciones', cotizacionesRoutes);
router.use('/auditoria-facturacion', bitacoraFacturacionRoutes);
router.use('/notas-credito', notasCreditoRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/compras', ordenesCompraRoutes);
router.use('/empresa-config', empresaConfigRoutes);
router.use('/notificaciones-superadmin', notificacionesSuperAdminRoutes);

export default router;


