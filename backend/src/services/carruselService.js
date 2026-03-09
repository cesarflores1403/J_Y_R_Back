import CarruselImagen from '../models/CarruselImagen.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class CarruselService {

  /* ── Listar imágenes activas (ordenadas) ── */
  async listar() {
    return await CarruselImagen.findAll({
      where: { activo: true },
      order: [['orden', 'ASC'], ['cod_imagen', 'ASC']]
    });
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
