import carruselService from '../services/carruselService.js';
import path from 'path';
import { promises as fs } from 'fs';
import sharp from 'sharp';

const EXT_SVG = '.svg';

const convertirImagenCarruselAWebp = async (file) => {
  if (!file?.path || !file?.filename) return null;

  const ext = path.extname(file.filename || '').toLowerCase();
  if (ext === EXT_SVG || ext === '.webp') {
    return `/uploads/${file.filename}`;
  }

  const baseName = ext ? file.filename.slice(0, file.filename.length - ext.length) : file.filename;
  const webpFilename = `${baseName}.webp`;
  const webpPath = path.join(path.dirname(file.path), webpFilename);

  await sharp(file.path)
    .rotate()
    .webp({ quality: 80, effort: 4 })
    .toFile(webpPath);

  if (file.path !== webpPath) {
    await fs.unlink(file.path).catch(() => undefined);
  }

  return `/uploads/${webpFilename}`;
};

/* GET /api/carrusel  — cualquier usuario autenticado */
export const listar = async (req, res, next) => {
  try {
    const imagenes = await carruselService.listar();
    res.json({ ok: true, datos: imagenes });
  } catch (error) {
    next(error);
  }
};

/* GET /api/carrusel/todas  — solo admin */
export const listarTodas = async (req, res, next) => {
  try {
    const imagenes = await carruselService.listarTodas();
    res.json({ ok: true, datos: imagenes });
  } catch (error) {
    next(error);
  }
};

/* POST /api/carrusel  — solo admin, con imagen */
export const subir = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, mensaje: 'Debe adjuntar una imagen' });
    }

    let imagen_url = `/uploads/${req.file.filename}`;
    try {
      const convertida = await convertirImagenCarruselAWebp(req.file);
      if (convertida) imagen_url = convertida;
    } catch (conversionError) {
      // Si falla la conversión, se mantiene el archivo original para no bloquear la carga.
      console.warn('[carrusel] No se pudo convertir imagen a WebP:', conversionError?.message || conversionError);
    }

    const { titulo, descripcion, orden } = req.body;

    const nueva = await carruselService.crear({
      titulo,
      descripcion,
      imagen_url,
      orden: orden ? parseInt(orden) : undefined
    });

    res.status(201).json({ ok: true, datos: nueva, mensaje: 'Imagen subida correctamente' });
  } catch (error) {
    next(error);
  }
};

/* PUT /api/carrusel/:codImagen  — solo admin */
export const actualizar = async (req, res, next) => {
  try {
    const { codImagen } = req.params;
    const imagen = await carruselService.actualizar(codImagen, req.body);
    res.json({ ok: true, datos: imagen, mensaje: 'Imagen actualizada' });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ ok: false, mensaje: error.mensaje });
    next(error);
  }
};

/* DELETE /api/carrusel/:codImagen  — solo admin */
export const eliminar = async (req, res, next) => {
  try {
    const { codImagen } = req.params;
    const resultado = await carruselService.eliminar(codImagen);
    res.json({ ok: true, ...resultado });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ ok: false, mensaje: error.mensaje });
    next(error);
  }
};
