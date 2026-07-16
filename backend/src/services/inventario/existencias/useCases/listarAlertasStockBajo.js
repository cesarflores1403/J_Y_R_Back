import repository from '../repository.js';
import {
  mapearFilaAlerta,
  normalizarTexto,
  parsearBoolean,
  resolverPaginacion
} from '../helpers.js';

const construirFiltroAlertas = (query = {}) => {
  const codProducto = query.cod_producto ? Number(query.cod_producto) : null;
  const codUbicacion = query.cod_ubicacion ? Number(query.cod_ubicacion) : null;
  const producto = normalizarTexto(query.producto);
  const ubicacion = normalizarTexto(query.ubicacion);
  const includeInactive = parsearBoolean(query.includeInactive);
  const soloCriticos = parsearBoolean(query.solo_criticos ?? query.soloCriticos);

  const whereBaseParts = ['1=1'];
  const replacements = {};

  if (!includeInactive) {
    whereBaseParts.push("p.estado_producto = 'Activo'");
  }

  if (codProducto !== null) {
    whereBaseParts.push('p.cod_producto = :codProducto');
    replacements.codProducto = codProducto;
  }

  if (codUbicacion !== null) {
    whereBaseParts.push('COALESCE(i.cod_ubicacion, p.cod_ubicacion) = :codUbicacion');
    replacements.codUbicacion = codUbicacion;
  }

  if (producto) {
    whereBaseParts.push(`
      (
        CAST(p.cod_producto AS TEXT) ILIKE :producto
        OR CONCAT('PROD-', LPAD(CAST(p.cod_producto AS TEXT), 4, '0')) ILIKE :producto
        OR p.nombre_producto ILIKE :producto
      )
    `);
    replacements.producto = `%${producto}%`;
  }

  if (ubicacion) {
    whereBaseParts.push(`
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

  const exprStockDisponible = '(COALESCE(i.stock, 0) - COALESCE(i.stock_reservado, 0))';
  const whereAlertaParts = [
    `${exprStockDisponible} <= COALESCE(i.stock_minimo, 0)`
  ];

  if (soloCriticos) {
    whereAlertaParts.push(`${exprStockDisponible} <= 0`);
  }

  return {
    exprStockDisponible,
    whereSql: [...whereBaseParts, ...whereAlertaParts].join(' AND '),
    replacements
  };
};

export const listarAlertasStockBajo = async (query = {}) => {
  const { page, limit, offset } = resolverPaginacion(query);
  const { whereSql, replacements, exprStockDisponible } = construirFiltroAlertas(query);

  const total = await repository.contarAlertas({ whereSql, replacements });
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const filasCrudas = await repository.listarFilasAlertas({
    whereSql,
    replacements,
    limit,
    offset,
    exprStockDisponible
  });

  const datos = filasCrudas
    .map(mapearFilaAlerta)
    .filter(Boolean);

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
