import { sequelize } from '../src/config/sequelize.js';
import fs from 'fs';
import path from 'path';

const seedCarruselMarcas = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conectado a la BD.');

    // Directorio de uploads
    const uploadsDir = path.resolve('uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Imágenes de marcas del frontend
    const frontendImgDir = path.resolve('..', 'frontend', 'src', 'assets', 'img');

    const marcas = [
      { nombre: 'Toyota', archivo: 'marca_toyota.png' },
      { nombre: 'Chevrolet', archivo: 'marca_chevrolet.png' },
      { nombre: 'Hyundai', archivo: 'marca_hyundai.png' },
      { nombre: 'Nissan', archivo: 'marca_nissan.png' },
      { nombre: 'Honda', archivo: 'marca_honda.png' },
      { nombre: 'Suzuki', archivo: 'marca_suzuki.png' },
      { nombre: 'Mitsubishi', archivo: 'marca_mitsubishi.svg' },
    ];

    for (let i = 0; i < marcas.length; i++) {
      const marca = marcas[i];
      const srcPath = path.join(frontendImgDir, marca.archivo);
      const destFilename = `carrusel-${marca.archivo}`;
      const destPath = path.join(uploadsDir, destFilename);

      // Copiar archivo a uploads si no existe
      if (!fs.existsSync(destPath)) {
        fs.copyFileSync(srcPath, destPath);
        console.log(`📋 Copiado: ${marca.archivo} → uploads/${destFilename}`);
      } else {
        console.log(`✅ Ya existe: uploads/${destFilename}`);
      }

      // Verificar si ya existe en la BD
      const [existing] = await sequelize.query(
        `SELECT cod_imagen FROM carrusel_imagenes WHERE titulo = :titulo`,
        { replacements: { titulo: marca.nombre } }
      );

      if (existing.length === 0) {
        await sequelize.query(
          `INSERT INTO carrusel_imagenes (titulo, descripcion, imagen_url, orden, activo)
           VALUES (:titulo, :descripcion, :imagen_url, :orden, true)`,
          {
            replacements: {
              titulo: marca.nombre,
              descripcion: `Repuestos ${marca.nombre}`,
              imagen_url: `/uploads/${destFilename}`,
              orden: i + 1
            }
          }
        );
        console.log(`✅ Insertado en BD: ${marca.nombre} (orden ${i + 1})`);
      } else {
        console.log(`⏭️  Ya existe en BD: ${marca.nombre}`);
      }
    }

    // Actualizar orden de imágenes existentes que no son marcas
    const [custom] = await sequelize.query(
      `SELECT cod_imagen FROM carrusel_imagenes WHERE titulo NOT IN ('Toyota','Chevrolet','Hyundai','Nissan','Honda','Suzuki','Mitsubishi') ORDER BY cod_imagen`
    );
    for (let i = 0; i < custom.length; i++) {
      await sequelize.query(
        `UPDATE carrusel_imagenes SET orden = :orden WHERE cod_imagen = :cod`,
        { replacements: { orden: marcas.length + i + 1, cod: custom[i].cod_imagen } }
      );
    }

    console.log('\n✅ Seed de marcas completado.');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

seedCarruselMarcas();
