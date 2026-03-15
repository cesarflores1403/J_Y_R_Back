import { Op, col, fn, where } from 'sequelize';
import Ubicacion from '../models/Ubicacion.js';
import { sequelize } from '../config/sequelize.js';

const ESTADO_ACTIVA = 'ACTIVA';
const ESTADO_INACTIVA = 'INACTIVA';
const LIMITE_DEFECTO = 10;
const LIMITE_MAXIMO = 200;

const normalizarTexto = (valor) => {
  if (valor === undefined || valor === null) return null;
  const limpio = String(valor).trim();
  return limpio.length > 0 ? limpio : null;
};

const normalizarMayuscula = (valor) => {
  const limpio = normalizarTexto(valor);
  return limpio ? limpio.toUpperCase() : null;
};

const formatearCodigoProducto = (codProducto) => `PROD-${String(Number(codProducto)).padStart(4, '0')}`;

const extraerCodProducto = (valor) => {
  const limpio = normalizarMayuscula(valor);
  if (!limpio) return null;

  const match = limpio.match(/(\d+)$/);
  if (!match) return null;

  const numero = Number.parseInt(match[1], 10);
  if (Number.isNaN(numero) || numero < 1) return null;
  return numero;
};

const parsearBoolean = (valor) => {
  if (typeof valor === 'boolean') return valor;
  if (typeof valor !== 'string') return false;
  return ['true', '1', 'yes', 'si'].includes(valor.trim().toLowerCase());
};

const parsearEntero = (valor, defecto, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const numero = Number.parseInt(valor, 10);
  if (Number.isNaN(numero)) return defecto;
  return Math.min(max, Math.max(min, numero));
};

const esErrorColumnaNoExiste = (error, nombreColumna) => {
  if (!error) return false;
  if (error.code !== '42703') return false;
  const mensaje = String(error.message || error.original?.message || '').toLowerCase();
  return mensaje.includes(String(nombreColumna).toLowerCase());
};

const construirPayload = (datos) => {
  const codProducto = extraerCodProducto(datos.codigo_producto);
  return {
    pasillo: normalizarMayuscula(datos.pasillo),
    estanteria: normalizarMayuscula(datos.estanteria),
    nivel_1: normalizarMayuscula(datos.nivel_1),
    nivel_2: normalizarMayuscula(datos.nivel_2),
    cod_producto: codProducto,
    codigo_producto: codProducto ? formatearCodigoProducto(codProducto) : null,
    descripcion: normalizarTexto(datos.descripcion)
  };
};

class UbicacionService {
  async validarProductoExiste(codProducto) {
    if (!Number.isInteger(codProducto) || codProducto < 1) {
      throw Object.assign(new Error('El codigo_producto es requerido'), { status: 400 });
    }

    const [producto] = await sequelize.query(
      `
        SELECT p.cod_producto
        FROM producto p
        WHERE p.cod_producto = :codProducto
        LIMIT 1
      `,
      {
        replacements: { codProducto },
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (!producto) {
      throw Object.assign(new Error('El codigo_producto no existe en el catalogo real de productos'), { status: 400 });
    }

    return formatearCodigoProducto(producto.cod_producto);
  }

  async listar({ includeInactive = 'false', page = 1, limit = LIMITE_DEFECTO }) {
    const incluirInactivas = parsearBoolean(includeInactive);
    const pagina = parsearEntero(page, 1, { min: 1 });
    const limite = parsearEntero(limit, LIMITE_DEFECTO, { min: 1, max: LIMITE_MAXIMO });
    const offset = (pagina - 1) * limite;
    const whereClause = incluirInactivas ? {} : { estado_ubi: ESTADO_ACTIVA };

    const { rows, count } = await Ubicacion.findAndCountAll({
      where: whereClause,
      order: [
        ['estado_ubi', 'ASC'],
        ['pasillo', 'ASC'],
        ['estanteria', 'ASC'],
        ['nivel_1', 'ASC'],
        ['nivel_2', 'ASC'],
        ['cod_ubicacion', 'ASC']
      ],
      offset,
      limit: limite
    });

    const totalPaginas = Math.max(1, Math.ceil(count / limite));

    return {
      data: rows,
      meta: {
        total: Number(count || 0),
        page: pagina,
        limit: limite,
        totalPages: totalPaginas
      }
    };
  }

  async obtenerPorId(id) {
    const ubicacion = await Ubicacion.findByPk(id);
    if (!ubicacion) {
      throw Object.assign(new Error('Ubicacion no encontrada'), { status: 404 });
    }
    return ubicacion;
  }

  async validarDuplicados(payload, idExcluir = null) {
    const whereId = idExcluir ? { cod_ubicacion: { [Op.ne]: idExcluir } } : {};

    const condicionesCombinacion = [
      where(fn('LOWER', col('pasillo')), payload.pasillo.toLowerCase()),
      where(fn('LOWER', col('estanteria')), payload.estanteria.toLowerCase()),
      where(fn('LOWER', col('nivel_1')), payload.nivel_1.toLowerCase())
    ];

    if (payload.nivel_2 === null) {
      condicionesCombinacion.push({
        [Op.or]: [
          { nivel_2: { [Op.is]: null } },
          { nivel_2: '' }
        ]
      });
    } else {
      condicionesCombinacion.push(where(fn('LOWER', col('nivel_2')), payload.nivel_2.toLowerCase()));
    }

    const porCombinacion = await Ubicacion.findOne({
      where: {
        ...whereId,
        [Op.and]: condicionesCombinacion
      }
    });

    if (porCombinacion) {
      throw Object.assign(new Error('Ya existe una ubicacion con esa combinacion fisica'), { status: 409 });
    }
  }

  async crear(datos) {
    const payload = construirPayload(datos);
    payload.codigo_producto = await this.validarProductoExiste(payload.cod_producto);
    await this.validarDuplicados(payload);

    return Ubicacion.create({
      ...payload,
      estado_ubi: ESTADO_ACTIVA
    });
  }

  async actualizar(id, datos) {
    const ubicacion = await this.obtenerPorId(id);
    const payload = construirPayload(datos);

    payload.codigo_producto = await this.validarProductoExiste(payload.cod_producto);
    await this.validarDuplicados(payload, id);
    await ubicacion.update(payload);

    return ubicacion;
  }

  async desactivar(id) {
    const ubicacion = await this.obtenerPorId(id);

    let totalConInventarioOperativo = 0;
    try {
      const [usoInventario] = await sequelize.query(
        `
          SELECT COUNT(*)::int AS total
          FROM inventario
          WHERE cod_ubicacion = :id
            AND (
              COALESCE(stock, 0) > 0
              OR COALESCE(stock_reservado, 0) > 0
            )
        `,
        {
          replacements: { id },
          type: sequelize.QueryTypes.SELECT
        }
      );
      totalConInventarioOperativo = Number(usoInventario?.total || 0);
    } catch (error) {
      if (!esErrorColumnaNoExiste(error, 'stock_reservado')) {
        throw error;
      }

      const [usoInventarioFallback] = await sequelize.query(
        `
          SELECT COUNT(*)::int AS total
          FROM inventario
          WHERE cod_ubicacion = :id
            AND COALESCE(stock, 0) > 0
        `,
        {
          replacements: { id },
          type: sequelize.QueryTypes.SELECT
        }
      );
      totalConInventarioOperativo = Number(usoInventarioFallback?.total || 0);
    }

    if (totalConInventarioOperativo > 0) {
      throw Object.assign(
        new Error('No se puede desactivar la ubicacion porque tiene inventario con stock o reserva'),
        { status: 409 }
      );
    }

    if (ubicacion.estado_ubi !== ESTADO_INACTIVA) {
      await ubicacion.update({ estado_ubi: ESTADO_INACTIVA });
    }
    return ubicacion;
  }

  async reactivar(id) {
    const ubicacion = await this.obtenerPorId(id);
    if (ubicacion.estado_ubi !== ESTADO_ACTIVA) {
      await ubicacion.update({ estado_ubi: ESTADO_ACTIVA });
    }
    return ubicacion;
  }

  async eliminar(id) {
    const ubicacion = await this.obtenerPorId(id);
    const [usoInventario] = await sequelize.query(
      'SELECT COUNT(*)::int AS total FROM inventario WHERE cod_ubicacion = :id',
      {
        replacements: { id },
        type: sequelize.QueryTypes.SELECT
      }
    );

    if ((usoInventario?.total || 0) > 0) {
      throw Object.assign(
        new Error('No se puede eliminar la ubicacion porque tiene inventario asociado'),
        { status: 409 }
      );
    }

    await ubicacion.destroy();
    return null;
  }
}

export default new UbicacionService();

