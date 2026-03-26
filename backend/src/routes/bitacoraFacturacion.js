import { Router } from 'express';
import { autenticar, autorizar } from '../middlewares/auth.js';
import { listar, tiposEvento, exportarExcel, eliminarEvento } from '../controllers/bitacoraFacturacionController.js';

const router = Router();

router.use(autenticar);
router.use(autorizar('Administrador'));

router.get('/', listar);
router.get('/tipos-evento', tiposEvento);
router.get('/exportar-excel', exportarExcel);
router.get('/exportar-csv', exportarExcel);
router.delete('/:id', autorizar('Super Administrador'), eliminarEvento);

export default router;
