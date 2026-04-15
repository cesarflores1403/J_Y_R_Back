import EmpresaConfig from '../models/EmpresaConfig.js';
import { sequelize } from '../config/sequelize.js';
import { QueryTypes } from 'sequelize';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CORRELATIVO_IDENTIFICADORES = {
  factura: {
    tabla: 'factura',
    columna: 'cod_factura'
  },
  cotizacion: {
    tabla: 'cotizacion',
    columna: 'cod_cotizacion'
  }
};

const obtenerIdentificadorSeguro = (tabla, columna) => {
  const match = Object.values(CORRELATIVO_IDENTIFICADORES).find(
    (item) => item.tabla === tabla && item.columna === columna
  );

  if (!match) {
    throw Object.assign(new Error('Identificador de correlativo no permitido'), { statusCode: 400 });
  }

  return match;
};

const asegurarSecuenciaSegura = (secuencia) => {
  // Permite formatos como public.factura_cod_factura_seq
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/.test(String(secuencia || ''))) {
    throw Object.assign(new Error('Nombre de secuencia no valido'), { statusCode: 500 });
  }
};

const empresaConfigService = {
  async _asegurarCampoLogoFactura() {
    await sequelize.query(
      'ALTER TABLE empresa_config ADD COLUMN IF NOT EXISTS logo_factura_url VARCHAR(300)',
      { type: QueryTypes.RAW }
    );
  },

  async _obtenerSecuencia(tabla, columna, transaction = null) {
    const row = await sequelize.query(
      'SELECT pg_get_serial_sequence(:tabla, :columna) AS secuencia',
      {
        replacements: { tabla, columna },
        type: QueryTypes.SELECT,
        transaction
      }
    );

    const secuencia = row?.[0]?.secuencia;
    if (!secuencia) {
      throw Object.assign(new Error(`No se encontro la secuencia para ${tabla}.${columna}`), { statusCode: 500 });
    }
    return secuencia;
  },

  async _obtenerMaximo(tabla, columna, transaction = null) {
    const id = obtenerIdentificadorSeguro(tabla, columna);
    const row = await sequelize.query(
      `SELECT COALESCE(MAX(${id.columna}), 0) AS maximo FROM ${id.tabla}`,
      { type: QueryTypes.SELECT, transaction }
    );
    return parseInt(row?.[0]?.maximo || 0, 10);
  },

  async _obtenerSiguienteNumero(tabla, columna, transaction = null) {
    const id = obtenerIdentificadorSeguro(tabla, columna);
    const secuencia = await this._obtenerSecuencia(tabla, columna, transaction);
    asegurarSecuenciaSegura(secuencia);
    const estadoSecuencia = await sequelize.query(
      `SELECT last_value, is_called FROM ${secuencia}`,
      { type: QueryTypes.SELECT, transaction }
    );
    const ultimoValor = parseInt(estadoSecuencia?.[0]?.last_value || 0, 10);
    const fueUsada = Boolean(estadoSecuencia?.[0]?.is_called);
    const siguientePorSecuencia = fueUsada ? (ultimoValor + 1) : ultimoValor;
    const maximoTabla = await this._obtenerMaximo(id.tabla, id.columna, transaction);
    return Math.max(siguientePorSecuencia, maximoTabla + 1);
  },

  async obtener() {
    await this._asegurarCampoLogoFactura();
    let config = await EmpresaConfig.findOne();
    if (!config) {
      // Crear con los datos por defecto si no existe
      config = await EmpresaConfig.create({
        nombre: 'J&R Accesorios y Reparaciones',
        rtn: '08011992200700',
        direccion: 'Bo. Villa Adela, 14 y 15 calle, 6 avenida esquina opuesta Gasolinera Uno, Comayagüela.',
        telefono: '9483-1906 / 8865-7197',
        correo: 'accesoriosjyr4@gmail.com',
        cai: '4A03DF-5A587E-8106E0-63BE03-09097B-B1',
        rango_autorizado: '000-001-01-00000351 al 000-001-01-00000450',
        fecha_limite_emision: '2026-08-04',
        propietaria: 'Prop. Ledy Lizzeth Chavarría',
        garantia: '2 MESES DE GARANTÍA POR FILTRACIÓN DE AGUA',
        logo_factura_url: null,
      });
    }
    return config;
  },

  async actualizar(datos) {
    await this._asegurarCampoLogoFactura();
    let config = await EmpresaConfig.findOne();
    if (!config) {
      config = await EmpresaConfig.create({ ...datos, actualizado_en: new Date() });
    } else {
      await config.update({ ...datos, actualizado_en: new Date() });
    }
    return config;
  },

  async actualizarLogoFactura(logoFacturaUrl) {
    await this._asegurarCampoLogoFactura();

    const config = await this.obtener();
    const logoAnterior = config.logo_factura_url;

    await config.update({
      logo_factura_url: logoFacturaUrl,
      actualizado_en: new Date()
    });

    // Limpia el archivo anterior solo si era local de uploads y diferente al nuevo.
    if (
      logoAnterior &&
      logoAnterior !== logoFacturaUrl &&
      logoAnterior.startsWith('/uploads/')
    ) {
      try {
        const uploadsDir = path.resolve(__dirname, '../../uploads');
        const filePath = path.join(uploadsDir, path.basename(logoAnterior));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // No interrumpir flujo por error al borrar archivo previo.
      }
    }

    return config;
  },

  async quitarLogoFactura() {
    await this._asegurarCampoLogoFactura();

    const config = await this.obtener();
    const logoAnterior = config.logo_factura_url;

    await config.update({
      logo_factura_url: null,
      actualizado_en: new Date()
    });

    if (logoAnterior && logoAnterior.startsWith('/uploads/')) {
      try {
        const uploadsDir = path.resolve(__dirname, '../../uploads');
        const filePath = path.join(uploadsDir, path.basename(logoAnterior));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // No interrumpir flujo por error al borrar archivo previo.
      }
    }

    return config;
  },

  async obtenerCorrelativos() {
    const siguienteFactura = await this._obtenerSiguienteNumero('factura', 'cod_factura');
    const siguienteCotizacion = await this._obtenerSiguienteNumero('cotizacion', 'cod_cotizacion');
    const maxFactura = await this._obtenerMaximo('factura', 'cod_factura');
    const maxCotizacion = await this._obtenerMaximo('cotizacion', 'cod_cotizacion');

    return {
      siguiente_factura: siguienteFactura,
      siguiente_cotizacion: siguienteCotizacion,
      min_factura: maxFactura + 1,
      min_cotizacion: maxCotizacion + 1
    };
  },

  async actualizarCorrelativos(datos) {
    const siguienteFacturaRaw = datos?.siguiente_factura;
    const siguienteCotizacionRaw = datos?.siguiente_cotizacion;

    const hayFactura = siguienteFacturaRaw !== undefined && siguienteFacturaRaw !== null && `${siguienteFacturaRaw}`.trim() !== '';
    const hayCotizacion = siguienteCotizacionRaw !== undefined && siguienteCotizacionRaw !== null && `${siguienteCotizacionRaw}`.trim() !== '';

    if (!hayFactura && !hayCotizacion) {
      throw Object.assign(new Error('Debes enviar al menos un correlativo a actualizar'), { statusCode: 400 });
    }

    const siguienteFactura = hayFactura ? parseInt(siguienteFacturaRaw, 10) : null;
    const siguienteCotizacion = hayCotizacion ? parseInt(siguienteCotizacionRaw, 10) : null;

    if (hayFactura && (!Number.isInteger(siguienteFactura) || siguienteFactura < 1)) {
      throw Object.assign(new Error('El siguiente numero de factura debe ser un entero mayor que 0'), { statusCode: 400 });
    }
    if (hayCotizacion && (!Number.isInteger(siguienteCotizacion) || siguienteCotizacion < 1)) {
      throw Object.assign(new Error('El siguiente numero de cotizacion debe ser un entero mayor que 0'), { statusCode: 400 });
    }

    const t = await sequelize.transaction();
    try {
      if (hayFactura) {
        const maxFactura = await this._obtenerMaximo('factura', 'cod_factura', t);
        const minimoPermitido = maxFactura + 1;
        if (siguienteFactura < minimoPermitido) {
          throw Object.assign(new Error(`El correlativo de factura no puede ser menor a ${minimoPermitido}`), { statusCode: 400 });
        }

        const secFactura = await this._obtenerSecuencia('factura', 'cod_factura', t);
        await sequelize.query(
          'SELECT setval(:secuencia::regclass, :valor, false)',
          {
            replacements: { secuencia: secFactura, valor: siguienteFactura },
            type: QueryTypes.SELECT,
            transaction: t
          }
        );
      }

      if (hayCotizacion) {
        const maxCotizacion = await this._obtenerMaximo('cotizacion', 'cod_cotizacion', t);
        const minimoPermitido = maxCotizacion + 1;
        if (siguienteCotizacion < minimoPermitido) {
          throw Object.assign(new Error(`El correlativo de cotizacion no puede ser menor a ${minimoPermitido}`), { statusCode: 400 });
        }

        const secCotizacion = await this._obtenerSecuencia('cotizacion', 'cod_cotizacion', t);
        await sequelize.query(
          'SELECT setval(:secuencia::regclass, :valor, false)',
          {
            replacements: { secuencia: secCotizacion, valor: siguienteCotizacion },
            type: QueryTypes.SELECT,
            transaction: t
          }
        );
      }

      await t.commit();
      return this.obtenerCorrelativos();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }
};

export default empresaConfigService;
