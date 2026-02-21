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

const router = express.Router();

router.use('/producto', productoRoutes);
router.use('/auth', authRoutes);
router.use('/clientes', clientesRoutes);
router.use('/proveedores', proveedoresRoutes);
router.use('/reportes', reportesRoutes);
router.use('/facturas', facturasRoutes);
router.use('/isv', isvRoutes);
router.use('/ubicaciones', ubicacionesRoutes);
router.use('/inventario', inventarioExistenciasRoutes);

export default router;
