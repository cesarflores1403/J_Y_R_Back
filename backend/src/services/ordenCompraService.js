import pool from '../config/db-connection.js';

class OrdenCompraService {

  async listar({ pagina = 1, limite = 15, buscar = '', estado = '' }) {
    const offset = (pagina - 1) * limite;
    const params = [];
    const condiciones = [];
    let idx = 1;

    if (buscar) {
      condiciones.push(`p.nombre_proveedor ILIKE $${idx}`);
      params.push(`%${buscar}%`);
      idx++;
    }
    if (estado) {
      condiciones.push(`oc.cod_estado_oc = $${idx}`);
      params.push(estado);
      idx++;
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [countRes, dataRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM orden_compra oc JOIN proveedor p ON oc.cod_proveedor = p.cod_proveedor ${where}`, params),
      pool.query(`
        SELECT
          oc.cod_orden_compra, oc.fecha, oc.moneda, oc.total, oc.observaciones,
          p.cod_proveedor, p.nombre_proveedor,
          e.cod_estado_oc, e.nombre AS estado,
          u.nombre_usuario
        FROM orden_compra oc
        JOIN proveedor p ON oc.cod_proveedor = p.cod_proveedor
        JOIN cat_estado_orden_compra e ON oc.cod_estado_oc = e.cod_estado_oc
        JOIN usuarios u ON oc.cod_usuario = u.cod_usuario
        ${where}
        ORDER BY oc.fecha DESC
        LIMIT $${idx} OFFSET $${idx + 1}
      `, [...params, limite, offset])
    ]);

    const total = parseInt(countRes.rows[0].count);
    return { datos: dataRes.rows, total, pagina: parseInt(pagina), totalPaginas: Math.ceil(total / limite) };
  }

  async obtenerPorId(id) {
    const [ordenRes, detallesRes] = await Promise.all([
      pool.query(`
        SELECT
          oc.cod_orden_compra, oc.fecha, oc.moneda, oc.total, oc.observaciones,
          p.cod_proveedor, p.nombre_proveedor,
          e.cod_estado_oc, e.nombre AS estado,
          u.nombre_usuario
        FROM orden_compra oc
        JOIN proveedor p ON oc.cod_proveedor = p.cod_proveedor
        JOIN cat_estado_orden_compra e ON oc.cod_estado_oc = e.cod_estado_oc
        JOIN usuarios u ON oc.cod_usuario = u.cod_usuario
        WHERE oc.cod_orden_compra = $1
      `, [id]),
      pool.query(`
        SELECT
          doc.cod_detalle_oc, doc.cod_producto,
          pr.nombre_producto,
          doc.cantidad, doc.precio, doc.isv, doc.subtotal
        FROM detalles_orden_compra doc
        JOIN producto pr ON doc.cod_producto = pr.cod_producto
        WHERE doc.cod_orden_compra = $1
      `, [id])
    ]);

    if (!ordenRes.rows[0]) throw Object.assign(new Error('Orden no encontrada'), { statusCode: 404 });
    return { ...ordenRes.rows[0], detalles: detallesRes.rows };
  }

  async crear({ cod_proveedor, moneda = 'HNL', observaciones, detalles, cod_usuario }) {
    if (!detalles?.length) throw Object.assign(new Error('Debe incluir al menos un producto'), { statusCode: 400 });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const total = detalles.reduce((s, d) => s + parseFloat(d.subtotal || 0), 0);

      const { rows: [{ cod_orden_compra }] } = await client.query(`
        INSERT INTO orden_compra (cod_proveedor, cod_usuario, cod_estado_oc, moneda, total, observaciones)
        VALUES ($1, $2, 1, $3, $4, $5) RETURNING cod_orden_compra
      `, [cod_proveedor, cod_usuario, moneda, total.toFixed(2), observaciones || null]);

      await client.query(
        `INSERT INTO estado_orden_compra (cod_orden_compra, cod_estado_oc, observaciones) VALUES ($1, 1, 'Orden creada')`,
        [cod_orden_compra]
      );

      for (const d of detalles) {
        const subtotal = (parseFloat(d.precio) + parseFloat(d.isv || 0)) * parseInt(d.cantidad);
        await client.query(
          `INSERT INTO detalles_orden_compra (cod_orden_compra, cod_producto, cantidad, precio, isv, subtotal) VALUES ($1,$2,$3,$4,$5,$6)`,
          [cod_orden_compra, d.cod_producto, d.cantidad, d.precio, d.isv || 0, subtotal.toFixed(2)]
        );
      }

      await client.query('COMMIT');
      return this.obtenerPorId(cod_orden_compra);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async _sumarStock(client, detalles) {
    const ubicRes = await client.query(`SELECT cod_ubicacion FROM ubicacion LIMIT 1`);
    const cod_ubicacion = ubicRes.rows[0]?.cod_ubicacion || null;

    for (const d of detalles) {
      const cantidad = parseInt(d.cantidad);
      const existe = await client.query(
        `SELECT cod_inventario FROM inventario WHERE cod_producto = $1 LIMIT 1`,
        [d.cod_producto]
      );
      if (existe.rows.length) {
        await client.query(
          `UPDATE inventario SET stock = stock + $1, fecha_ult_mov = NOW() WHERE cod_producto = $2`,
          [cantidad, d.cod_producto]
        );
      } else if (cod_ubicacion) {
        await client.query(
          `INSERT INTO inventario (cod_producto, cod_ubicacion, stock, stock_minimo, stock_maximo, fecha_ult_mov) VALUES ($1, $2, $3, 0, 9999, NOW())`,
          [d.cod_producto, cod_ubicacion, cantidad]
        );
      }
    }
  }

  async _restarStock(client, detalles) {
    for (const d of detalles) {
      const cantidad = parseInt(d.cantidad);
      await client.query(
        `UPDATE inventario SET stock = GREATEST(stock - $1, 0), fecha_ult_mov = NOW() WHERE cod_producto = $2`,
        [cantidad, d.cod_producto]
      );
    }
  }

  async cambiarEstado(id, { cod_estado_oc, observaciones }) {
    const orden = await this.obtenerPorId(id);

    if ([4, 5].includes(parseInt(orden.cod_estado_oc))) {
      throw Object.assign(new Error('No se puede cambiar el estado de una orden finalizada'), { statusCode: 400 });
    }

    const nuevoEstado = parseInt(cod_estado_oc);
    const estadoAnterior = parseInt(orden.cod_estado_oc);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(`UPDATE orden_compra SET cod_estado_oc = $1 WHERE cod_orden_compra = $2`, [nuevoEstado, id]);
      await client.query(
        `INSERT INTO estado_orden_compra (cod_orden_compra, cod_estado_oc, observaciones) VALUES ($1, $2, $3)`,
        [id, nuevoEstado, observaciones || null]
      );

      if (nuevoEstado === 2) {
        await this._sumarStock(client, orden.detalles, id);
      }

      if (nuevoEstado === 5 && estadoAnterior === 2) {
        await this._restarStock(client, orden.detalles, id);
      }

      await client.query('COMMIT');
      return this.obtenerPorId(id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async obtenerHistorial(id) {
    const res = await pool.query(`
      SELECT eoc.cod_est_orden_compra, eoc.fecha, eoc.observaciones, e.nombre AS estado
      FROM estado_orden_compra eoc
      JOIN cat_estado_orden_compra e ON eoc.cod_estado_oc = e.cod_estado_oc
      WHERE eoc.cod_orden_compra = $1
      ORDER BY eoc.fecha ASC
    `, [id]);
    return res.rows;
  }

  async listarEstados() {
    const res = await pool.query(`SELECT cod_estado_oc, nombre, orden FROM cat_estado_orden_compra ORDER BY orden`);
    return res.rows;
  }

  async eliminar(id) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const check = await client.query(`SELECT cod_estado_oc FROM orden_compra WHERE cod_orden_compra = $1`, [id]);
      if (!check.rows.length) throw new Error('Orden no encontrada');
      if (parseInt(check.rows[0].cod_estado_oc) !== 5) throw new Error('Solo se pueden eliminar órdenes canceladas');

      await client.query(`DELETE FROM estado_orden_compra WHERE cod_orden_compra = $1`, [id]);
      await client.query(`DELETE FROM detalles_orden_compra WHERE cod_orden_compra = $1`, [id]);
      await client.query(`DELETE FROM orden_compra WHERE cod_orden_compra = $1`, [id]);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async productosDisponibles(buscar = '') {
    const res = buscar?.trim()
      ? await pool.query(`
          SELECT p.cod_producto, p.nombre_producto, p.precio_venta, COALESCE(i.porcentaje, 0) AS isv_porcentaje
          FROM producto p LEFT JOIN catalogo_isv i ON p.cod_isv = i.cod_isv
          WHERE p.estado_producto = 'Activo' AND p.nombre_producto ILIKE $1
          ORDER BY p.nombre_producto LIMIT 200
        `, [`%${buscar}%`])
      : await pool.query(`
          SELECT p.cod_producto, p.nombre_producto, p.precio_venta, COALESCE(i.porcentaje, 0) AS isv_porcentaje
          FROM producto p LEFT JOIN catalogo_isv i ON p.cod_isv = i.cod_isv
          WHERE p.estado_producto = 'Activo'
          ORDER BY p.nombre_producto LIMIT 200
        `);
    return res.rows;
  }
}

export default new OrdenCompraService();
