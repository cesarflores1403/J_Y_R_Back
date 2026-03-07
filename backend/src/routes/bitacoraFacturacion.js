import { Router } from 'express';
import { autenticar, autorizar } from '../middlewares/auth.js';
import { listar, tiposEvento, exportarCSV } from '../controllers/bitacoraFacturacionController.js';

const router = Router();

router.use(autenticar);
router.use(autorizar('Administrador'));

router.get('/', listar);
router.get('/tipos-evento', tiposEvento);
router.get('/exportar-csv', exportarCSV);

export default router;
