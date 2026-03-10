import { Router } from 'express';
import { autenticar, autorizar } from '../middlewares/auth.js';
import { obtener, actualizar } from '../controllers/empresaConfigController.js';

const router = Router();

router.use(autenticar);

// GET: cualquier autenticado puede leer (se necesita para facturas)
router.get('/', obtener);

// PUT: solo Super Administrador puede modificar
router.put('/', autorizar('Super Administrador'), actualizar);

export default router;
