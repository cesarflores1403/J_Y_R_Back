import { LIMITE_DEFAULT, LIMITE_MAXIMO, PAGINA_DEFAULT } from './constants.js';

export const parsearEntero = (valor, fallback) => {
  if (valor === undefined || valor === null || valor === '') return fallback;
  const parsed = Number.parseInt(valor, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

export const resolverPaginacion = (query = {}) => {
  const page = Math.max(1, parsearEntero(query.page ?? query.pagina, PAGINA_DEFAULT));
  const limit = Math.max(1, Math.min(LIMITE_MAXIMO, parsearEntero(query.limit ?? query.limite, LIMITE_DEFAULT)));

  return {
    page,
    limit,
    offset: (page - 1) * limit
  };
};

export const normalizarTexto = (valor) => {
  if (valor === undefined || valor === null) return null;
  const limpio = String(valor).trim();
  return limpio.length > 0 ? limpio : null;
};

export const normalizarFecha = (valor) => {
  if (!valor) return null;
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return null;
    return valor.toISOString().slice(0, 10);
  }

  const texto = String(valor).trim();
  if (!texto) return null;

  const matchIso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchIso) return `${matchIso[1]}-${matchIso[2]}-${matchIso[3]}`;

  const fecha = new Date(texto);
  if (Number.isNaN(fecha.getTime())) return null;
  return fecha.toISOString().slice(0, 10);
};

export const construirContextoJoin = (schemaMovimiento) => {
  const exprCodProducto = schemaMovimiento.codProducto
    ? `m.${schemaMovimiento.codProducto}`
    : 'i.cod_producto';
  const exprCodUbicacion = schemaMovimiento.codUbicacion
    ? `m.${schemaMovimiento.codUbicacion}`
    : 'i.cod_ubicacion';

  const joinInventario = schemaMovimiento.codInventario
    ? `LEFT JOIN inventario i ON i.cod_inventario = m.${schemaMovimiento.codInventario}`
    : '';

  return {
    exprCodProducto,
    exprCodUbicacion,
    joinInventario
  };
};
