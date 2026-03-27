import { sequelize } from '../config/sequelize.js';
import Cliente from '../models/Cliente.js';
import Proveedor from '../models/ProveedorModel.js';
import ProductoSeq from '../models/ProductoSeq.js';
import Factura from '../models/Factura.js';

class ReporteService {
  constructor() {
    this.columnaFechaFacturaCache = null;
  }

  async obtenerColumnaFechaFactura() {
    if (this.columnaFechaFacturaCache) return this.columnaFechaFacturaCache;

    const [columnas] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'factura'
    `);

    const columnasSet = new Set((columnas || []).map((c) => String(c.column_name || '').toLowerCase()));
    const candidatas = ['creado_en', 'fecha_factura', 'fecha_emision', 'fecha', 'created_at', 'actualizado_en', 'updated_at'];
    const encontrada = candidatas.find((col) => columnasSet.has(col)) || null;

    this.columnaFechaFacturaCache = encontrada;
    return encontrada;
  }

  normalizarPeriodoVentas(periodo) {
    const periodoNormalizado = String(periodo || '').trim().toLowerCase();
    const permitidos = ['diaria', 'semanal', 'quincenal', 'mensual', 'trimestral', 'anual'];
    return permitidos.includes(periodoNormalizado) ? periodoNormalizado : 'mensual';
  }

  obtenerDefinicionPeriodoVentas(periodo, campoFechaSql) {
    if (!campoFechaSql) {
      return {
        descripcion: 'Sin filtro por fecha',
        whereSql: '1=1'
      };
    }

    switch (periodo) {
      case 'diaria':
        return {
          descripcion: 'Hoy',
          whereSql: `${campoFechaSql} >= date_trunc('day', CURRENT_DATE) AND ${campoFechaSql} < date_trunc('day', CURRENT_DATE) + interval '1 day'`
        };
      case 'semanal':
        return {
          descripcion: 'Últimos 7 días',
          whereSql: `${campoFechaSql} >= date_trunc('day', CURRENT_DATE) - interval '6 days' AND ${campoFechaSql} < date_trunc('day', CURRENT_DATE) + interval '1 day'`
        };
      case 'quincenal':
        return {
          descripcion: 'Últimos 15 días',
          whereSql: `${campoFechaSql} >= date_trunc('day', CURRENT_DATE) - interval '14 days' AND ${campoFechaSql} < date_trunc('day', CURRENT_DATE) + interval '1 day'`
        };
      case 'trimestral':
        return {
          descripcion: 'Trimestre actual',
          whereSql: `${campoFechaSql} >= date_trunc('quarter', CURRENT_DATE) AND ${campoFechaSql} < date_trunc('day', CURRENT_DATE) + interval '1 day'`
        };
      case 'anual':
        return {
          descripcion: 'Año actual',
          whereSql: `${campoFechaSql} >= date_trunc('year', CURRENT_DATE) AND ${campoFechaSql} < date_trunc('day', CURRENT_DATE) + interval '1 day'`
        };
      case 'mensual':
      default:
        return {
          descripcion: 'Mes actual',
          whereSql: `${campoFechaSql} >= date_trunc('month', CURRENT_DATE) AND ${campoFechaSql} < date_trunc('day', CURRENT_DATE) + interval '1 day'`
        };
    }
  }

  async dashboard() {
    // Conteos principales del dashboard
    const totalClientes = await Cliente.count();
    const totalProveedores = await Proveedor.count({ where: { estado_proveedor: true } });
    const totalProductos = await ProductoSeq.count({ where: { estado_producto: 'Activo' } });
    const totalFacturas = await Factura.count({ where: { estado: true } });

    // Resumen economico de ventas
    const [ventasResult] = await sequelize.query(`
      SELECT COALESCE(SUM(subtotal),0) as subtotal,
             COALESCE(SUM(isv),0) as isv,
             COALESCE(SUM(total),0) as total
      FROM factura
      WHERE estado = true
    `);

    // Alertas de inventario separadas: sin existencia y stock bajo
    const [alertasInventarioResult] = await sequelize.query(`
      SELECT
        COUNT(*) FILTER (
          WHERE (COALESCE(i.stock, 0) - COALESCE(i.stock_reservado, 0)) <= 0
        )::int AS sin_existencia,
        COUNT(*) FILTER (
          WHERE (COALESCE(i.stock, 0) - COALESCE(i.stock_reservado, 0)) > 0
            AND (COALESCE(i.stock, 0) - COALESCE(i.stock_reservado, 0)) <= COALESCE(i.stock_minimo, 0)
        )::int AS stock_bajo
      FROM inventario i
      LEFT JOIN producto p ON p.cod_producto = i.cod_producto
      WHERE p.cod_producto IS NULL OR p.estado_producto = 'Activo'
    `);

    const [productosBajoMinimo] = await sequelize.query(`
      SELECT
        p.cod_producto,
        p.nombre_producto,
        COALESCE(SUM(i.stock), 0)::int AS stock_total,
        COALESCE(p.stock_minimo, MAX(COALESCE(i.stock_minimo, 0)), 0)::int AS stock_minimo,
        p.punto_reorden,
        CASE
          WHEN COALESCE(p.stock_minimo, MAX(COALESCE(i.stock_minimo, 0)), 0) > 0
            THEN COALESCE(p.stock_minimo, MAX(COALESCE(i.stock_minimo, 0)), 0)
          WHEN COALESCE(p.punto_reorden, 0) > 0
            THEN COALESCE(p.punto_reorden, 0)
          ELSE 1
        END::int AS umbral_stock,
        (
          CASE
            WHEN COALESCE(p.stock_minimo, MAX(COALESCE(i.stock_minimo, 0)), 0) > 0
              THEN COALESCE(p.stock_minimo, MAX(COALESCE(i.stock_minimo, 0)), 0)
            WHEN COALESCE(p.punto_reorden, 0) > 0
              THEN COALESCE(p.punto_reorden, 0)
            ELSE 1
          END
          - COALESCE(SUM(i.stock), 0)
        )::int AS faltante
      FROM producto p
      LEFT JOIN inventario i ON i.cod_producto = p.cod_producto
      WHERE p.estado_producto = 'Activo'
      GROUP BY p.cod_producto, p.nombre_producto, p.stock_minimo, p.punto_reorden
      HAVING COALESCE(SUM(i.stock), 0) < (
        CASE
          WHEN COALESCE(p.stock_minimo, MAX(COALESCE(i.stock_minimo, 0)), 0) > 0
            THEN COALESCE(p.stock_minimo, MAX(COALESCE(i.stock_minimo, 0)), 0)
          WHEN COALESCE(p.punto_reorden, 0) > 0
            THEN COALESCE(p.punto_reorden, 0)
          ELSE 1
        END
      )
      ORDER BY faltante DESC, p.nombre_producto ASC
      LIMIT 10
    `);

    const stockEnCero = Number((productosBajoMinimo || []).filter((p) => Number(p.stock_total || 0) <= 0).length || 0);
    const stockBajo = Number((productosBajoMinimo || []).length || 0) - stockEnCero;

    const [ultimasFacturas] = await sequelize.query(`
      SELECT f.cod_factura, c.nombre, c.apellido, f.total, f.estado,
             u.nombre_usuario
      FROM factura f
      JOIN clientes c ON c.cod_cliente = f.cod_cliente
      JOIN usuarios u ON u.cod_usuario = f.cod_usuario
      ORDER BY f.cod_factura DESC
      LIMIT 5
    `);

    return {
      totalClientes,
      totalProveedores,
      totalProductos,
      totalFacturas,
      ventasTotales: ventasResult[0] || { subtotal: 0, isv: 0, total: 0 },
      // Compatibilidad con consumidores existentes
      stockBajo,
      // Campos nuevos para desglose explicito en UI
      stockEnCero,
      alertasInventario: {
        stockBajo,
        stockEnCero,
        total: stockBajo + stockEnCero
      },
      productosBajoMinimo: productosBajoMinimo || [],
      ultimasFacturas
    };
  }

  async ventas(periodo) {
    const periodoNormalizado = this.normalizarPeriodoVentas(periodo);
    const columnaFecha = await this.obtenerColumnaFechaFactura();
    const campoFechaSql = columnaFecha ? `f.${columnaFecha}` : null;
    const definicionPeriodo = this.obtenerDefinicionPeriodoVentas(periodoNormalizado, campoFechaSql);

    const [resumen] = await sequelize.query(`
      SELECT COUNT(*) as total_facturas,
             COALESCE(SUM(subtotal),0) as subtotal,
             COALESCE(SUM(isv),0) as isv,
             COALESCE(SUM(total),0) as total
      FROM factura f
      WHERE f.estado = true
        AND ${definicionPeriodo.whereSql}
    `);

    const [detalle] = await sequelize.query(`
      SELECT f.cod_factura, c.nombre || ' ' || COALESCE(c.apellido,'') as cliente,
             u.nombre_usuario, f.subtotal, f.isv, f.total, f.estado,
             mp.nombre as metodo_pago
      FROM factura f
      JOIN clientes c ON c.cod_cliente = f.cod_cliente
      JOIN usuarios u ON u.cod_usuario = f.cod_usuario
      LEFT JOIN cat_metodo_pago mp ON mp.cod_cat_metodo_pago = f.metodo_pago
      WHERE f.estado = true
        AND ${definicionPeriodo.whereSql}
      ORDER BY f.cod_factura DESC
    `);

    const [rango] = await sequelize.query(`
          SELECT MIN(${campoFechaSql || 'NULL'})::date as fecha_inicio,
            MAX(${campoFechaSql || 'NULL'})::date as fecha_fin
      FROM factura f
      WHERE f.estado = true
        AND ${definicionPeriodo.whereSql}
    `);

    const [ultimasFacturas] = await sequelize.query(`
      SELECT f.cod_factura, c.nombre, c.apellido, f.total, f.estado,
             u.nombre_usuario
      FROM factura f
      JOIN clientes c ON c.cod_cliente = f.cod_cliente
      JOIN usuarios u ON u.cod_usuario = f.cod_usuario
      WHERE ${definicionPeriodo.whereSql}
      ORDER BY f.cod_factura DESC
      LIMIT 5
    `);

    return {
      periodo: periodoNormalizado,
      periodoDescripcion: definicionPeriodo.descripcion,
      rango: rango?.[0] || { fecha_inicio: null, fecha_fin: null },
      resumen: resumen[0],
      detalle,
      ultimasFacturas
    };
  }

  async productosVendidos() {
    const [productos] = await sequelize.query(`
      SELECT p.nombre_producto,
             SUM(df.cantidad) as total_vendido,
             SUM(df.subtotal) as total_ingresos
      FROM detalle_factura df
      JOIN producto p ON p.cod_producto = df.cod_producto
      JOIN factura f ON f.cod_factura = df.cod_factura
      WHERE f.estado = true AND df.tipo_item = 'PRODUCTO'
      GROUP BY p.cod_producto, p.nombre_producto
      ORDER BY total_vendido DESC
      LIMIT 20
    `);

    return { productos };
  }

  async inventario() {
    const [productos] = await sequelize.query(`
      SELECT p.cod_producto, p.nombre_producto, p.precio_venta,
             cp.nombre_categoria,
             COALESCE(SUM(i.stock), 0) as stock_total,
             COALESCE(MIN(i.stock_minimo), 0) as stock_minimo,
             (COALESCE(SUM(i.stock), 0) * p.precio_venta) as valor_total
      FROM producto p
      LEFT JOIN inventario i ON i.cod_producto = p.cod_producto
      LEFT JOIN categoria_producto cp ON cp.cod_categoria = p.cod_categoria
      WHERE p.estado_producto = 'Activo'
      GROUP BY p.cod_producto, p.nombre_producto, p.precio_venta, cp.nombre_categoria
      ORDER BY p.nombre_producto
    `);

    const resumen = {
      totalProductos: productos.length,
      totalUnidades: productos.reduce((s, p) => s + parseInt(p.stock_total || 0), 0),
      valorTotal: productos.reduce((s, p) => s + parseFloat(p.valor_total || 0), 0)
    };

    return { resumen, productos };
  }
}

export default new ReporteService();
