import express from 'express';
import { getIsv, getAllIsv } from '../controllers/isvController.js';

const router = express.Router();

// GET /api/v1/isv — Catálogo ISV activos
router.get('/', getIsv);

// GET /api/v1/isv/all — Catálogo ISV completo
router.get('/all', getAllIsv);

export default router;
