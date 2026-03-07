import { Router } from 'express';
import { body } from 'express-validator';
import { validarCampos } from '../middlewares/validar.js';
import { autenticar } from '../middlewares/auth.js';
import {
  listar, obtener, crear, cambiarEstado,
  historial, listarEstados, eliminar, productosDisponibles
} from '../controllers/ordenCompraController.js';

const router = Router();
router.use(autenticar);

router.get('/estados', listarEstados);
router.get('/productos-disponibles', productosDisponibles);
router.get('/', listar);
router.get('/:id', obtener);
router.get('/:id/historial', historial);

router.post('/', [
  body('cod_proveedor').isInt({ min: 1 }).withMessage('Proveedor requerido'),
  body('detalles').isArray({ min: 1 }).withMessage('Debe incluir al menos un producto'),
  validarCampos
], crear);

router.patch('/:id/estado', [
  body('cod_estado_oc').isInt({ min: 1 }).withMessage('Estado requerido'),
  validarCampos
], cambiarEstado);

router.delete('/:id', eliminar);

export default router;