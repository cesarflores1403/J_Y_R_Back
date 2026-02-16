import express from 'express';
import productoRoutes from './producto.routes.js';

const router = express.Router();

router.use('/producto', productoRoutes);

export default router;
