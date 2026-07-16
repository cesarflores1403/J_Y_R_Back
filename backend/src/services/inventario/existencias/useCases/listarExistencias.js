import repository from '../repository.js';
import {
  mapearFilaExistencia,
  normalizarTexto,
  parsearBoolean,
  resolverPaginacion
} from '../helpers.js';

const construirFiltroExistencias = (query = {}) => {
  const codProducto = query.cod_producto ? Number(query.cod_producto) : null;
  const codUbicacion = query.cod_ubicacion ? Number(query.cod_ubicacion) : null;
  const producto = normalizarTexto(query.producto);
  const ubicacion = normalizarTexto(query.ubicacion);
  const includeInactive = parsearBoolean(query.includeInactive);

  const whereParts = ['1=1'];
  const replacements = {};

  if (!includeInactive) {
    whereParts.push("p.estado_producto = 'Activo'");
  }

  if (codProducto !== null) {
    whereParts.push('p.cod_producto = :codProducto');
    replacements.codProducto = codProducto;
  }

  if (codUbicacion !== null) {
    whereParts.push('COALESCE(i.cod_ubicacion, p.cod_ubicacion) = :codUbicacion');
    replacements.codUbicacion = codUbicacion;
  }

  if (producto) {
    whereParts.push(`
      (
        CAST(p.cod_producto AS TEXT) ILIKE :producto
        OR CONCAT('PROD-', LPAD(CAST(p.cod_producto AS TEXT), 4, '0')) ILIKE :producto
        OR p.nombre_producto ILIKE :producto
      )
    `);
    replacements.producto = `%${producto}%`;
  }

  if (ubicacion) {
    whereParts.push(`
      (
        CAST(COALESCE(i.cod_ubicacion, p.cod_ubicacion) AS TEXT) ILIKE :ubicacion
        OR COALESCE(u.codigo_producto, '') ILIKE :ubicacion
        OR COALESCE(u.pasillo, '') ILIKE :ubicacion
        OR COALESCE(u.estanteria, '') ILIKE :ubicacion
        OR COALESCE(u.nivel_1, '') ILIKE :ubicacion
        OR COALESCE(u.nivel_2, '') ILIKE :ubicacion
      )
    `);
    replacements.ubicacion = `%${ubicacion}%`;
  }

  return {
    whereSql: whereParts.join(' AND '),
    replacements
  };
};

const consolidarPorProducto = (filasNormalizadas = []) => {
  const consolidadoMap = new Map();

  for (const fila of filasNormalizadas) {
    const key = Number(fila.cod_producto);
    const actual = consolidadoMap.get(key);

    if (!actual) {
      consolidadoMap.set(key, {
        ...fila,
        stock: Number(fila.stock || 0),
        stock_reservado: Number(fila.stock_reservado || 0)
      });
      continue;
    }

    actual.stock += Number(fila.stock || 0);
    actual.stock_reservado += Number(fila.stock_reservado || 0);

    const actualStock = Number(actual.stock || 0);
    const filaStock = Number(fila.stock || 0);
    const actualFecha = actual.fecha_ult_mov ? new Date(actual.fecha_ult_mov).getTime() : 0;
    const filaFecha = fila.fecha_ult_mov ? new Date(fila.fecha_ult_mov).getTime() : 0;

    const reemplazarRepresentativa =
      (actualStock <= 0 && filaStock > 0)
      || (filaStock > actualStock)
      || (filaFecha > actualFecha);

    if (reemplazarRepresentativa) {
      actual.cod_inventario = fila.cod_inventario;
      actual.cod_ubicacion = fila.cod_ubicacion;
      actual.ubicacion = fila.ubicacion;
      actual.stock_minimo = fila.stock_minimo;
      actual.stock_maximo = fila.stock_maximo;
      actual.fecha_ult_mov = fila.fecha_ult_mov;
    }

    consolidadoMap.set(key, actual);
  }

  return Array.from(consolidadoMap.values())
    .map((fila) => mapearFilaExistencia(fila))
    .sort((a, b) => String(a.nombre_producto || '').localeCompare(String(b.nombre_producto || ''), 'es'));
};

export const listarExistencias = async (query = {}) => {
  const { page, limit, offset } = resolverPaginacion(query);
  const { whereSql, replacements } = construirFiltroExistencias(query);

  const filasCrudas = await repository.listarFilasExistencias({ whereSql, replacements });
  const filasNormalizadas = filasCrudas.map(mapearFilaExistencia);
  const datosConsolidados = consolidarPorProducto(filasNormalizadas);

  const total = datosConsolidados.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const inicio = Math.max(0, offset);
  const fin = inicio + limit;
  const datos = datosConsolidados.slice(inicio, fin);

  return {
    data: datos,
    meta: {
      total,
      page,
      limit,
      totalPages
    },
    datos,
    total,
    pagina: page,
    limite: limit,
    totalPaginas: totalPages,
    page,
    limit,
    totalPages
  };
};
