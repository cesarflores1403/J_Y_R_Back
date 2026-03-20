import empresaConfigService from '../services/empresaConfigService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_URL_FILE = path.resolve(__dirname, '../../../public-url.txt');

const leerPrimeraLineaNoVacia = (contenido = '') => {
  const lineas = String(contenido).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lineas.length > 0 ? lineas[0] : '';
};

const verificarUrlPublica = async (urlBase) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const baseNormalizada = String(urlBase || '').replace(/\/$/, '');
    if (!baseNormalizada) {
      return { activa: false, detalle: 'URL vacia' };
    }

    const response = await fetch(`${baseNormalizada}/api/test`, {
      method: 'GET',
      signal: controller.signal
    });

    const payload = await response.json().catch(() => null);
    const activa = response.ok && Boolean(payload?.ok);

    return {
      activa,
      status: response.status,
      detalle: activa ? 'URL verificada correctamente' : 'La URL respondio, pero no paso la validacion de API'
    };
  } catch (error) {
    return {
      activa: false,
      detalle: error.name === 'AbortError' ? 'Tiempo de espera agotado al verificar la URL' : (error.message || 'No se pudo verificar la URL')
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

export const obtener = async (req, res) => {
  try {
    const config = await empresaConfigService.obtener();
    res.json({ ok: true, datos: config });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
};

export const actualizar = async (req, res) => {
  try {
    const config = await empresaConfigService.actualizar(req.body);
    res.json({ ok: true, datos: config, mensaje: 'Datos de empresa actualizados correctamente' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const obtenerCorrelativos = async (req, res) => {
  try {
    const datos = await empresaConfigService.obtenerCorrelativos();
    res.json({ ok: true, datos });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const actualizarCorrelativos = async (req, res) => {
  try {
    const datos = await empresaConfigService.actualizarCorrelativos(req.body);
    res.json({ ok: true, datos, mensaje: 'Correlativos actualizados correctamente' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const subirLogoFactura = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, mensaje: 'Debe adjuntar una imagen para el logo' });
    }

    const logoFacturaUrl = `/uploads/${req.file.filename}`;
    const config = await empresaConfigService.actualizarLogoFactura(logoFacturaUrl);
    res.json({ ok: true, datos: config, mensaje: 'Logo de factura actualizado correctamente' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const quitarLogoFactura = async (req, res) => {
  try {
    const config = await empresaConfigService.quitarLogoFactura();
    res.json({ ok: true, datos: config, mensaje: 'Logo de factura restablecido al predeterminado' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const obtenerUrlSistema = async (_req, res) => {
  try {
    if (!fs.existsSync(PUBLIC_URL_FILE)) {
      return res.json({
        ok: true,
        datos: {
          url: '',
          activa: false,
          detalle: 'Aun no hay URL publica generada',
          verificada_en: new Date().toISOString(),
          archivo_actualizado_en: null
        }
      });
    }

    const contenido = fs.readFileSync(PUBLIC_URL_FILE, 'utf8');
    const url = leerPrimeraLineaNoVacia(contenido);
    const stats = fs.statSync(PUBLIC_URL_FILE);

    if (!/^https?:\/\//i.test(url)) {
      return res.json({
        ok: true,
        datos: {
          url: '',
          activa: false,
          detalle: 'El archivo de URL no contiene una direccion valida',
          verificada_en: new Date().toISOString(),
          archivo_actualizado_en: stats.mtime.toISOString()
        }
      });
    }

    const resultado = await verificarUrlPublica(url);

    return res.json({
      ok: true,
      datos: {
        url,
        activa: resultado.activa,
        detalle: resultado.detalle,
        status: resultado.status || null,
        verificada_en: new Date().toISOString(),
        archivo_actualizado_en: stats.mtime.toISOString()
      }
    });
  } catch (error) {
    return res.status(500).json({ ok: false, mensaje: error.message || 'No se pudo obtener la URL del sistema' });
  }
};
