import { Router } from 'express';
import { autenticar, autorizar } from '../middlewares/auth.js';
import { listar, obtener, crear, anular, eliminar, productosDisponibles, clientesDisponibles } from '../controllers/facturaController.js';

const router = Router();

// Todas las rutas requieren autenticación
router.use(autenticar);

// Endpoints auxiliares para el formulario
router.get('/productos-disponibles', productosDisponibles);
router.get('/clientes-disponibles', clientesDisponibles);

// CRUD facturas
router.get('/', listar);
router.get('/:id', obtener);

// Solo Administrador y Cajero pueden crear facturas
router.post('/', autorizar('Administrador', 'Cajero'), crear);

// Solo Administrador puede anular
router.patch('/:id/anular', autorizar('Administrador'), anular);

// Solo Administrador puede eliminar permanentemente
router.delete('/:id', autorizar('Administrador'), eliminar);

export default router;
