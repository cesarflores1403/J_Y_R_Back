import { Router } from 'express';
import { autenticar } from '../middlewares/auth.js';
import { dashboard, ventas, productosVendidos, inventario } from '../controllers/reporteController.js';

const router = Router();

router.use(autenticar);

router.get('/dashboard', dashboard);
router.get('/ventas', ventas);
router.get('/productos-vendidos', productosVendidos);
router.get('/inventario', inventario);

export default router;
