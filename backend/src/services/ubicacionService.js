import { Op, cast, col, fn, where } from 'sequelize';
import Ubicacion from '../models/Ubicacion.js';
import { sequelize } from '../config/sequelize.js';
import { generarReportePdf } from '../utils/pdfReport.js';

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

const construirWhereUbicaciones = ({ includeInactive = 'false', search = '', buscar = '', q = '' } = {}) => {
  const incluirInactivas = parsearBoolean(includeInactive);
  const criterioBusqueda = normalizarTexto(search ?? buscar ?? q);
  const criterioLike = `%${String(criterioBusqueda || '').toLowerCase()}%`;
  const whereClause = incluirInactivas ? {} : { estado_ubi: ESTADO_ACTIVA };

  if (criterioBusqueda) {
    whereClause[Op.and] = [
      {
        [Op.or]: [
          where(fn('LOWER', cast(col('cod_ubicacion'), 'TEXT')), { [Op.like]: criterioLike }),
          where(fn('LOWER', fn('COALESCE', col('codigo_producto'), '')), { [Op.like]: criterioLike }),
          where(fn('LOWER', cast(col('cod_producto'), 'TEXT')), { [Op.like]: criterioLike }),
          where(fn('LOWER', fn('COALESCE', col('pasillo'), '')), { [Op.like]: criterioLike }),
          where(fn('LOWER', fn('COALESCE', col('estanteria'), '')), { [Op.like]: criterioLike }),
          where(fn('LOWER', fn('COALESCE', col('nivel_1'), '')), { [Op.like]: criterioLike }),
          where(fn('LOWER', fn('COALESCE', col('nivel_2'), '')), { [Op.like]: criterioLike }),
          where(fn('LOWER', fn('COALESCE', col('descripcion'), '')), { [Op.like]: criterioLike }),
          where(fn('LOWER', fn('COALESCE', col('estado_ubi'), '')), { [Op.like]: criterioLike })
        ]
      }
    ];
  }

  return { whereClause, criterioBusqueda, incluirInactivas };
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

  async listar({ includeInactive = 'false', page = 1, limit = LIMITE_DEFECTO, search = '', buscar = '', q = '' }) {
    const pagina = parsearEntero(page, 1, { min: 1 });
    const limite = parsearEntero(limit, LIMITE_DEFECTO, { min: 1, max: LIMITE_MAXIMO });
    const offset = (pagina - 1) * limite;
    const { whereClause, criterioBusqueda } = construirWhereUbicaciones({ includeInactive, search, buscar, q });

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
        totalPages: totalPaginas,
        search: criterioBusqueda || ''
      }
    };
  }

  async exportarReportePdf({ includeInactive = 'false', search = '', buscar = '', q = '' } = {}) {
    const { whereClause, criterioBusqueda, incluirInactivas } = construirWhereUbicaciones({
      includeInactive,
      search,
      buscar,
      q
    });

    const ubicaciones = await Ubicacion.findAll({
      where: whereClause,
      order: [
        ['estado_ubi', 'ASC'],
        ['pasillo', 'ASC'],
        ['estanteria', 'ASC'],
        ['nivel_1', 'ASC'],
        ['nivel_2', 'ASC'],
        ['cod_ubicacion', 'ASC']
      ]
    });

    return generarReportePdf({
      titulo: 'Reporte de ubicaciones',
      filtros: [
        { label: 'Busqueda', value: criterioBusqueda || 'Todos' },
        { label: 'Incluye inactivas', value: incluirInactivas ? 'Si' : 'No' }
      ],
      metricas: [
        { label: 'Total de ubicaciones', value: ubicaciones.length }
      ],
      columnas: [
        { header: '#', key: 'numero', width: 32, align: 'center' },
        { header: 'ID', key: 'id', width: 42, align: 'center' },
        { header: 'Producto', key: 'codigoProducto', width: 76 },
        { header: 'Pasillo', key: 'pasillo', width: 70 },
        { header: 'Estanteria', key: 'estanteria', width: 82 },
        { header: 'Nivel 1', key: 'nivel1', width: 70 },
        { header: 'Nivel 2', key: 'nivel2', width: 70 },
        { header: 'Estado', key: 'estado', width: 76 },
        { header: 'Descripcion', key: 'descripcion', width: 202 }
      ],
      filas: ubicaciones.map((ubicacion, index) => ({
        numero: index + 1,
        id: ubicacion.cod_ubicacion,
        codigoProducto: ubicacion.codigo_producto || (ubicacion.cod_producto ? formatearCodigoProducto(ubicacion.cod_producto) : '-'),
        pasillo: ubicacion.pasillo,
        estanteria: ubicacion.estanteria,
        nivel1: ubicacion.nivel_1,
        nivel2: ubicacion.nivel_2 || '-',
        estado: ubicacion.estado_ubi,
        descripcion: ubicacion.descripcion || '-'
      }))
    });
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

