import { Op, col, fn, where } from 'sequelize';
import Ubicacion from '../models/Ubicacion.js';
import { sequelize } from '../config/sequelize.js';

const ESTADO_ACTIVA = 'ACTIVA';
const ESTADO_INACTIVA = 'INACTIVA';

const normalizarTexto = (valor) => {
  if (valor === undefined || valor === null) return null;
  const limpio = String(valor).trim();
  return limpio.length > 0 ? limpio : null;
};

const normalizarMayuscula = (valor) => {
  const limpio = normalizarTexto(valor);
  return limpio ? limpio.toUpperCase() : null;
};

const parsearBoolean = (valor) => {
  if (typeof valor === 'boolean') return valor;
  if (typeof valor !== 'string') return false;
  return ['true', '1', 'yes', 'si'].includes(valor.trim().toLowerCase());
};

const construirPayload = (datos) => {
  return {
    pasillo: normalizarMayuscula(datos.pasillo),
    estanteria: normalizarMayuscula(datos.estanteria),
    nivel_1: normalizarMayuscula(datos.nivel_1),
    nivel_2: normalizarMayuscula(datos.nivel_2),
    codigo_qr: normalizarMayuscula(datos.codigo_qr),
    descripcion: normalizarTexto(datos.descripcion)
  };
};

class UbicacionService {
  async listar({ includeInactive = 'false' }) {
    const incluirInactivas = parsearBoolean(includeInactive);
    const whereClause = incluirInactivas ? {} : { estado_ubi: ESTADO_ACTIVA };

    return Ubicacion.findAll({
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

    const porCodigo = await Ubicacion.findOne({
      where: {
        ...whereId,
        [Op.and]: [
          where(fn('LOWER', col('codigo_qr')), payload.codigo_qr.toLowerCase())
        ]
      }
    });

    if (porCodigo) {
      throw Object.assign(new Error('Ya existe una ubicacion con ese codigo/comb'), { status: 409 });
    }

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
      throw Object.assign(new Error('Ya existe una ubicacion con ese codigo/comb'), { status: 409 });
    }
  }

  async crear(datos) {
    const payload = construirPayload(datos);
    await this.validarDuplicados(payload);

    return Ubicacion.create({
      ...payload,
      estado_ubi: ESTADO_ACTIVA
    });
  }

  async actualizar(id, datos) {
    const ubicacion = await this.obtenerPorId(id);
    const payload = construirPayload(datos);

    await this.validarDuplicados(payload, id);
    await ubicacion.update(payload);

    return ubicacion;
  }

  async desactivar(id) {
    const ubicacion = await this.obtenerPorId(id);
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
