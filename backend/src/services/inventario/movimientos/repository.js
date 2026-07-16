import { sequelize } from '../../../config/sequelize.js';

class InventarioMovimientosRepository {
  async contar({ selectBase, replacements }) {
    const [countRow] = await sequelize.query(`
      SELECT COUNT(*)::int AS total
      ${selectBase}
    `, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });

    return Number(countRow?.total || 0);
  }

  async listar({ schemaMovimiento, selectBase, replacements, orderBy, limit, offset, expressions }) {
    const {
      exprCodProducto,
      exprCodUbicacion,
      exprAnulado,
      exprCodMovimientoAnulacion,
      exprFechaAnulacion
    } = expressions;

    return sequelize.query(`
      SELECT
        ${schemaMovimiento.pk ? `m.${schemaMovimiento.pk} AS cod_movimiento,` : 'NULL::int AS cod_movimiento,'}
        ${schemaMovimiento.codInventario ? `m.${schemaMovimiento.codInventario} AS cod_inventario,` : 'NULL::int AS cod_inventario,'}
        ${exprCodProducto} AS cod_producto,
        p.nombre_producto,
        ${exprCodUbicacion} AS cod_ubicacion,
        COALESCE(
          NULLIF(CONCAT_WS('-', u.pasillo, u.estanteria, u.nivel_1, u.nivel_2), ''),
          CAST(u.cod_ubicacion AS TEXT),
          '-'
        ) AS ubicacion,
        CAST(m.${schemaMovimiento.fecha} AS TIMESTAMP) AS fecha_movimiento,
        UPPER(CAST(m.${schemaMovimiento.tipo} AS TEXT)) AS tipo,
        m.${schemaMovimiento.cantidad} AS cantidad,
        ${schemaMovimiento.referencia ? `CAST(m.${schemaMovimiento.referencia} AS TEXT)` : 'NULL::text'} AS referencia_documento,
        ${schemaMovimiento.observaciones ? `CAST(m.${schemaMovimiento.observaciones} AS TEXT)` : 'NULL::text'} AS observaciones,
        ${schemaMovimiento.motivo ? `CAST(m.${schemaMovimiento.motivo} AS TEXT)` : 'NULL::text'} AS motivo,
        ${schemaMovimiento.refTipo ? `CAST(m.${schemaMovimiento.refTipo} AS TEXT)` : 'NULL::text'} AS ref_tipo,
        ${schemaMovimiento.refId ? `m.${schemaMovimiento.refId}` : 'NULL::int'} AS ref_id,
        ${exprAnulado} AS anulado,
        ${exprCodMovimientoAnulacion} AS cod_movimiento_anulacion,
        ${exprFechaAnulacion} AS fecha_anulacion,
        ${schemaMovimiento.codUsuario ? `m.${schemaMovimiento.codUsuario}` : 'NULL::int'} AS cod_usuario,
        ${schemaMovimiento.codUsuario ? 'usu.nombre_usuario' : 'NULL::text'} AS nombre_usuario
      ${selectBase}
      ${orderBy}
      LIMIT :limit OFFSET :offset
    `, {
      replacements: {
        ...replacements,
        limit,
        offset
      },
      type: sequelize.QueryTypes.SELECT
    });
  }
}

export default new InventarioMovimientosRepository();
