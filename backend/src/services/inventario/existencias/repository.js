import { sequelize } from '../../../config/sequelize.js';
import { construirFromExistenciasBase, construirSelectExistenciasBase } from './helpers.js';

class InventarioExistenciasRepository {
  async listarFilasExistencias({ whereSql, replacements }) {
    return sequelize.query(`
      ${construirSelectExistenciasBase()}
      WHERE ${whereSql}
      ORDER BY
        p.nombre_producto ASC,
        COALESCE(i.cod_ubicacion, p.cod_ubicacion) ASC NULLS LAST,
        i.cod_inventario ASC NULLS LAST
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });
  }

  async contarAlertas({ whereSql, replacements }) {
    const [countRow] = await sequelize.query(`
      SELECT COUNT(*)::int AS total
      ${construirFromExistenciasBase()}
      WHERE ${whereSql}
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    return Number(countRow?.total || 0);
  }

  async listarFilasAlertas({ whereSql, replacements, limit, offset, exprStockDisponible }) {
    return sequelize.query(`
      ${construirSelectExistenciasBase()}
      WHERE ${whereSql}
      ORDER BY
        CASE WHEN ${exprStockDisponible} <= 0 THEN 0 ELSE 1 END ASC,
        ${exprStockDisponible} ASC,
        p.nombre_producto ASC,
        COALESCE(i.cod_ubicacion, p.cod_ubicacion) ASC NULLS LAST,
        i.cod_inventario ASC NULLS LAST
      LIMIT :limite OFFSET :offset
    `, {
      replacements: {
        ...replacements,
        limite: limit,
        offset
      },
      type: sequelize.QueryTypes.SELECT
    });
  }

  async obtenerExistenciaPorId(codInventario) {
    const [fila] = await sequelize.query(`
      ${construirSelectExistenciasBase()}
      WHERE i.cod_inventario = :codInventario
      LIMIT 1
    `, {
      replacements: { codInventario },
      type: sequelize.QueryTypes.SELECT
    });

    return fila || null;
  }

  async actualizarMinMax(codInventario, { stock_minimo: stockMinimo, stock_maximo: stockMaximo }) {
    await sequelize.query(`
      UPDATE inventario
      SET stock_minimo = :stockMinimo,
          stock_maximo = :stockMaximo
      WHERE cod_inventario = :codInventario
    `, {
      replacements: {
        codInventario,
        stockMinimo,
        stockMaximo
      },
      type: sequelize.QueryTypes.UPDATE
    });
  }
}

export default new InventarioExistenciasRepository();
