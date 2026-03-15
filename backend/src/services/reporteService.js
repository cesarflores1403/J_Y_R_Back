import { sequelize } from '../config/sequelize.js';
import Cliente from '../models/Cliente.js';
import Proveedor from '../models/ProveedorModel.js';
import ProductoSeq from '../models/ProductoSeq.js';
import Factura from '../models/Factura.js';

class ReporteService {
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

    const stockBajo = Number(alertasInventarioResult?.[0]?.stock_bajo || 0);
    const stockEnCero = Number(alertasInventarioResult?.[0]?.sin_existencia || 0);

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
      ultimasFacturas
    };
  }

  async ventas() {
    const [resumen] = await sequelize.query(`
      SELECT COUNT(*) as total_facturas,
             COALESCE(SUM(subtotal),0) as subtotal,
             COALESCE(SUM(isv),0) as isv,
             COALESCE(SUM(total),0) as total
      FROM factura WHERE estado = true
    `);

    const [detalle] = await sequelize.query(`
      SELECT f.cod_factura, c.nombre || ' ' || COALESCE(c.apellido,'') as cliente,
             u.nombre_usuario, f.subtotal, f.isv, f.total, f.estado,
             mp.nombre as metodo_pago
      FROM factura f
      JOIN clientes c ON c.cod_cliente = f.cod_cliente
      JOIN usuarios u ON u.cod_usuario = f.cod_usuario
      LEFT JOIN cat_metodo_pago mp ON mp.cod_cat_metodo_pago = f.metodo_pago
      ORDER BY f.cod_factura DESC
    `);

    return { resumen: resumen[0], detalle };
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
