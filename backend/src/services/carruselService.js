import CarruselImagen from '../models/CarruselImagen.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, '../../uploads');

const titulosFallback = {
  chevrolet: 'Chevrolet',
  honda: 'Honda',
  hyundai: 'Hyundai',
  mitsubishi: 'Mitsubishi',
  nissan: 'Nissan',
  suzuki: 'Suzuki',
  toyota: 'Toyota'
};

const esErrorConexion = (error) => {
  const nombre = String(error?.name || '');
  const codigo = String(error?.parent?.code || error?.original?.code || error?.code || '');
  return nombre.includes('Connection') || ['XX000', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'].includes(codigo);
};

const listarFallbackLocal = () => {
  if (!fs.existsSync(uploadsDir)) return [];

  return fs.readdirSync(uploadsDir)
    .filter((archivo) => /^carrusel-marca_.+\.(png|jpe?g|webp|gif|svg)$/i.test(archivo))
    .sort((a, b) => a.localeCompare(b))
    .map((archivo, index) => {
      const clave = archivo
        .replace(/^carrusel-marca_/i, '')
        .replace(/\.[^.]+$/, '')
        .toLowerCase();

      return {
        cod_imagen: -(index + 1),
        titulo: titulosFallback[clave] || clave,
        descripcion: null,
        imagen_url: `/uploads/${archivo}`,
        orden: index + 1,
        activo: true,
        fecha_creacion: null
      };
    });
};

class CarruselService {

  /* ── Listar imágenes activas (ordenadas) ── */
  async listar() {
    try {
      return await CarruselImagen.findAll({
        where: { activo: true },
        order: [['orden', 'ASC'], ['cod_imagen', 'ASC']]
      });
    } catch (error) {
      if (!esErrorConexion(error)) throw error;
      console.warn('[carrusel] BD no disponible; usando imagenes locales:', error.message);
      return listarFallbackLocal();
    }
  }

  /* ── Listar todas (admin) ── */
  async listarTodas() {
    return await CarruselImagen.findAll({
      order: [['orden', 'ASC'], ['cod_imagen', 'ASC']]
    });
  }

  /* ── Subir imagen ── */
  async crear({ titulo, descripcion, imagen_url, orden }) {
    if (!orden && orden !== 0) {
      const max = await CarruselImagen.max('orden') || 0;
      orden = max + 1;
    }
    return await CarruselImagen.create({
      titulo: titulo || null,
      descripcion: descripcion || null,
      imagen_url,
      orden
    });
  }

  /* ── Actualizar datos (titulo, descripcion, orden, activo) ── */
  async actualizar(codImagen, datos) {
    const imagen = await CarruselImagen.findByPk(codImagen);
    if (!imagen) throw { status: 404, mensaje: 'Imagen no encontrada' };

    const camposPermitidos = ['titulo', 'descripcion', 'orden', 'activo'];
    camposPermitidos.forEach(campo => {
      if (datos[campo] !== undefined) imagen[campo] = datos[campo];
    });

    await imagen.save();
    return imagen;
  }

  /* ── Eliminar imagen (y archivo físico) ── */
  async eliminar(codImagen) {
    const imagen = await CarruselImagen.findByPk(codImagen);
    if (!imagen) throw { status: 404, mensaje: 'Imagen no encontrada' };

    // Eliminar archivo físico si existe
    try {
      const uploadsDir = path.resolve(__dirname, '../../uploads');
      const filePath = path.join(uploadsDir, path.basename(imagen.imagen_url));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error('Error eliminando archivo:', err.message);
    }

    await imagen.destroy();
    return { mensaje: 'Imagen eliminada correctamente' };
  }
}

export default new CarruselService();
