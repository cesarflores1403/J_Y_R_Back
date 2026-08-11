import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

const MAX_DIMENSION = 1000;
const WEBP_QUALITY = 68;

export const eliminarArchivoSeguro = async (filePath) => {
  if (!filePath) return;
  await fs.unlink(filePath).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });
};

export const optimizarImagenProducto = async (inputPath) => {
  const parsed = path.parse(inputPath);
  const outputPath = path.join(parsed.dir, `${parsed.name}-optimizada.webp`);

  try {
    const info = await sharp(inputPath, { failOn: 'error' })
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true
      })
      .webp({ quality: WEBP_QUALITY, effort: 6, smartSubsample: true })
      .toFile(outputPath);

    return {
      outputPath,
      filename: path.basename(outputPath),
      size: info.size,
      width: info.width,
      height: info.height,
      format: info.format
    };
  } catch (error) {
    await eliminarArchivoSeguro(outputPath);
    error.status = 400;
    error.message = 'La imagen no es valida o no pudo ser optimizada.';
    throw error;
  } finally {
    await eliminarArchivoSeguro(inputPath);
  }
};

export const IMAGEN_PRODUCTO_CONFIG = Object.freeze({
  maxDimension: MAX_DIMENSION,
  quality: WEBP_QUALITY,
  format: 'webp'
});
