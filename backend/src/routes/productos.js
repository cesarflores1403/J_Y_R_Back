import express from 'express';
import { getProducto, createProducto, updateProducto, deleteProducto, cambiarEstado } from '../controllers/productoController.js';
import {
  validarCrearProducto,
  validarActualizarProducto,
  validarCambiarEstado,
  validarEliminarProducto
} from '../middlewares/productoValidator.js';

const router = express.Router();

// GET /api/v1/productos
router.get('/', getProducto);

// POST /api/v1/productos
router.post('/', validarCrearProducto, createProducto);

// PUT /api/v1/productos
router.put('/', validarActualizarProducto, updateProducto);

// PATCH /api/v1/productos/estado — Cambiar estado (Activo/Inactivo/Descontinuado)
router.patch('/estado', validarCambiarEstado, cambiarEstado);

// DELETE /api/v1/productos
router.delete('/', validarEliminarProducto, deleteProducto);

export default router;
