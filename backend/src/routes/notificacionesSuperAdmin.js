import { Router } from 'express';
import { autenticar, autorizar } from '../middlewares/auth.js';
import { listar, marcarLeida, marcarTodasLeidas } from '../controllers/notificacionSuperAdminController.js';

const router = Router();

router.use(autenticar);
router.use(autorizar('Administrador'));

router.get('/', listar);
router.patch('/:id/leida', marcarLeida);
router.patch('/marcar-todas/leidas', marcarTodasLeidas);

export default router;
