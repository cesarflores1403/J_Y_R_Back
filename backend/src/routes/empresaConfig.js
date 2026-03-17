import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { autenticar, autorizar } from '../middlewares/auth.js';
import {
	obtener,
	actualizar,
	obtenerCorrelativos,
	actualizarCorrelativos,
	subirLogoFactura,
	quitarLogoFactura
} from '../controllers/empresaConfigController.js';
import { validarCampos } from '../middlewares/validar.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
	destination: (_req, _file, cb) => cb(null, uploadsDir),
	filename: (_req, file, cb) => {
		const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
		const ext = path.extname(file.originalname);
		cb(null, `logo-factura-${uniqueSuffix}${ext}`);
	}
});

const fileFilter = (_req, file, cb) => {
	const allowed = /jpeg|jpg|png|gif|webp|svg/;
	const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
	const mimeOk = allowed.test(file.mimetype.split('/')[1]);
	if (extOk && mimeOk) return cb(null, true);
	cb(new Error('Solo se permiten imagenes (jpg, png, gif, webp, svg)'));
};

const upload = multer({
	storage,
	fileFilter,
	limits: { fileSize: 5 * 1024 * 1024 }
});

router.use(autenticar);

// GET: cualquier autenticado puede leer (se necesita para facturas)
router.get('/', obtener);

// Correlativos (solo Super Administrador)
router.get('/correlativos', autorizar('Super Administrador'), obtenerCorrelativos);

router.put('/correlativos',
	autorizar('Super Administrador'),
	[
		body('siguiente_factura').optional().isInt({ min: 1 }).withMessage('siguiente_factura debe ser entero >= 1'),
		body('siguiente_cotizacion').optional().isInt({ min: 1 }).withMessage('siguiente_cotizacion debe ser entero >= 1'),
		body().custom((value) => {
			const tieneFactura = value?.siguiente_factura !== undefined && value?.siguiente_factura !== null && `${value.siguiente_factura}`.trim() !== '';
			const tieneCotizacion = value?.siguiente_cotizacion !== undefined && value?.siguiente_cotizacion !== null && `${value.siguiente_cotizacion}`.trim() !== '';
			if (!tieneFactura && !tieneCotizacion) {
				throw new Error('Debes enviar al menos un correlativo');
			}
			return true;
		}),
		validarCampos
	],
	actualizarCorrelativos
);

// Logo de factura (solo Super Administrador)
router.post('/logo-factura', autorizar('Super Administrador'), upload.single('logo'), subirLogoFactura);
router.delete('/logo-factura', autorizar('Super Administrador'), quitarLogoFactura);

// PUT: solo Super Administrador puede modificar
router.put('/', autorizar('Super Administrador'), actualizar);

export default router;
