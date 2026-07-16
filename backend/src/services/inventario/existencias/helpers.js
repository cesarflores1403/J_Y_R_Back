import { LIMITE_DEFAULT, LIMITE_MAXIMO, PAGINA_DEFAULT } from './constants.js';

export const normalizarTexto = (valor) => {
  if (valor === undefined || valor === null) return null;
  const limpio = String(valor).trim();
  return limpio.length > 0 ? limpio : null;
};

export const parsearBoolean = (valor) => {
  if (typeof valor === 'boolean') return valor;
  if (typeof valor !== 'string') return false;
  return ['true', '1', 'yes', 'si'].includes(valor.trim().toLowerCase());
};

export const parsearEntero = (valor, fallback) => {
  if (valor === undefined || valor === null || valor === '') return fallback;
  const parsed = Number.parseInt(valor, 10);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
};

export const resolverPaginacion = (query = {}) => {
  const page = parsearEntero(query.page ?? query.pagina, PAGINA_DEFAULT);
  const limit = parsearEntero(query.limit ?? query.limite, LIMITE_DEFAULT);

  const paginaNormalizada = Math.max(1, page);
  const limiteNormalizado = Math.max(1, Math.min(LIMITE_MAXIMO, limit));

  return {
    page: paginaNormalizada,
    limit: limiteNormalizado,
    offset: (paginaNormalizada - 1) * limiteNormalizado
  };
};

export const aNumero = (valor) => {
  if (valor === null || valor === undefined || valor === '') return 0;
  const parsed = Number(valor);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const calcularEstadoStock = ({ stock, stock_reservado, stock_minimo, stock_maximo }) => {
  const stockDisponible = aNumero(stock) - aNumero(stock_reservado);
  const stockMinimo = aNumero(stock_minimo);
  const stockMaximo = aNumero(stock_maximo);

  if (stockDisponible <= 0) {
    return { stock_disponible: stockDisponible, estado_stock: 'SIN_EXISTENCIA' };
  }

  if (stockDisponible <= stockMinimo) {
    return { stock_disponible: stockDisponible, estado_stock: 'CRITICO' };
  }

  if (stockMaximo > stockMinimo) {
    const umbralBajo = stockMinimo + Math.ceil((stockMaximo - stockMinimo) * 0.25);
    if (stockDisponible <= umbralBajo) {
      return { stock_disponible: stockDisponible, estado_stock: 'BAJO' };
    }
  }

  return { stock_disponible: stockDisponible, estado_stock: 'NORMAL' };
};

export const mapearFilaExistencia = (fila) => {
  if (!fila) return null;

  const stock = aNumero(fila.stock);
  const stockReservado = aNumero(fila.stock_reservado);
  const stockMinimo = aNumero(fila.stock_minimo);
  const stockMaximo = aNumero(fila.stock_maximo);

  const calculados = calcularEstadoStock({
    stock,
    stock_reservado: stockReservado,
    stock_minimo: stockMinimo,
    stock_maximo: stockMaximo
  });

  return {
    ...fila,
    stock,
    stock_reservado: stockReservado,
    stock_minimo: stockMinimo,
    stock_maximo: stockMaximo,
    stock_disponible: calculados.stock_disponible,
    estado_stock: calculados.estado_stock
  };
};

export const construirNivelAlerta = (estadoStock) => {
  if (estadoStock === 'SIN_EXISTENCIA') return 'CRITICA';
  if (estadoStock === 'CRITICO') return 'STOCK_BAJO';
  if (estadoStock === 'BAJO') return 'PREVENTIVA';
  return 'INFORMATIVA';
};

export const mapearFilaAlerta = (fila) => {
  const base = mapearFilaExistencia(fila);
  if (!base) return null;

  return {
    ...base,
    nivel_alerta: construirNivelAlerta(base.estado_stock)
  };
};

export const construirFromExistenciasBase = () => `
  FROM producto p
  LEFT JOIN inventario i ON i.cod_producto = p.cod_producto
  LEFT JOIN ubicacion u ON u.cod_ubicacion = COALESCE(i.cod_ubicacion, p.cod_ubicacion)
`;

export const construirSelectExistenciasBase = () => `
  SELECT
    i.cod_inventario,
    p.cod_producto,
    p.nombre_producto,
    COALESCE(i.cod_ubicacion, p.cod_ubicacion) AS cod_ubicacion,
    COALESCE(
      NULLIF(u.codigo_producto, ''),
      NULLIF(CONCAT_WS('-', u.pasillo, u.estanteria, u.nivel_1, u.nivel_2), ''),
      CASE
        WHEN COALESCE(i.cod_ubicacion, p.cod_ubicacion) IS NOT NULL
          THEN CAST(COALESCE(i.cod_ubicacion, p.cod_ubicacion) AS TEXT)
      END,
      'Sin ubicacion'
    ) AS ubicacion,
    COALESCE(i.stock, 0) AS stock,
    COALESCE(i.stock_reservado, 0) AS stock_reservado,
    COALESCE(i.stock_minimo, 0) AS stock_minimo,
    COALESCE(i.stock_maximo, 0) AS stock_maximo,
    i.fecha_ult_mov
  ${construirFromExistenciasBase()}
`;
