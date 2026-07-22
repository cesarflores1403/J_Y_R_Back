import * as importacionService from '../services/importacionService.js';
import { sendOk } from '../utils/response.js';

// =======================
// HU-12: IMPORTAR PRODUCTOS DESDE CSV/EXCEL
// =======================
export const importarProductos = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, mensaje: 'No se envió ningún archivo.' });
    }

    const resultado = await importacionService.importarProductos(
      req.file.buffer,
      req.file.originalname
    );

    // Si hay errores de validación, retornar 400 con el reporte
    if (resultado.errores.length > 0) {
      return res.status(400).json({
        ok: false,
        mensaje: `Se encontraron errores en ${resultado.errores.length} fila(s). No se insertó ningún producto.`,
        datos: resultado,
      });
    }

    return sendOk(res, {
      status: 201,
      message: `Se importaron ${resultado.insertados} producto(s) correctamente.`,
      data: resultado,
    });
  } catch (err) {
    next(err);
  }
};

// =======================
// HU-12: DESCARGAR PLANTILLA CSV
// =======================
export const descargarPlantilla = (_req, res) => {
  const csv = importacionService.generarPlantillaCSV();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla_productos.csv"');
  res.send('\uFEFF' + csv); // BOM UTF-8 para Excel
};
