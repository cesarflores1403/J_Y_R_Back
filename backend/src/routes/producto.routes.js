import express from 'express';
import { getProducto, createProducto, updateProducto, deleteProducto } from '../controllers/producto.controller.js';

const router = express.Router();

// GET /api/v1/productos
router.get('/', getProducto);

// POST /api/v1/productos
router.post('/', createProducto);

// PUT /api/v1/productos
router.put('/', updateProducto);

// DELETE /api/v1/productos
router.delete('/', deleteProducto);

export default router;
