import pool from '../config/db-connection.js';
import { generarReportePdf } from '../utils/pdfReport.js';

const construirFiltrosOrdenesCompra=({buscar='',estado=''}={})=>{
  const params=[];
  const condiciones=[];
  let idx=1;

  if(buscar){
    condiciones.push(`p.nombre_proveedor ILIKE $${idx}`);
    params.push(`%${buscar}%`);
    idx++;
  }

  if(estado){
    condiciones.push(`oc.cod_estado_oc = $${idx}`);
    params.push(estado);
    idx++;
  }

  return {
    params,
    idx,
    where:condiciones.length?`WHERE ${condiciones.join(' AND ')}`:''
  };
};

class OrdenCompraService{
  // Listar órdenes con filtros y paginación
  async listar({pagina=1,limite=15,buscar='',estado=''}) {
    const paginaNum=parseInt(pagina)||1;
    const limiteNum=parseInt(limite)||15;
    const offset=(paginaNum-1)*limiteNum;
    const {params,idx,where}=construirFiltrosOrdenesCompra({buscar,estado});

    const [countRes,dataRes]=await Promise.all([
      pool.query(
        `SELECT COUNT(*) FROM orden_compra oc
         JOIN proveedor p ON oc.cod_proveedor = p.cod_proveedor
         ${where}`,
        params
      ),
      pool.query(
        `SELECT
          oc.cod_orden_compra,oc.fecha,oc.moneda,oc.total,oc.observaciones,
          p.cod_proveedor,p.nombre_proveedor,
          e.cod_estado_oc,e.nombre AS estado,
          u.nombre_usuario
         FROM orden_compra oc
         JOIN proveedor p ON oc.cod_proveedor = p.cod_proveedor
         JOIN cat_estado_orden_compra e ON oc.cod_estado_oc = e.cod_estado_oc
         JOIN usuarios u ON oc.cod_usuario = u.cod_usuario
         ${where}
         ORDER BY oc.fecha DESC
         LIMIT $${idx} OFFSET $${idx+1}`,
        [...params,limiteNum,offset]
      )
    ]);

    const total=parseInt(countRes.rows[0].count);
    return {
      datos:dataRes.rows,
      total,
      pagina:paginaNum,
      totalPaginas:Math.ceil(total/limiteNum)
    };
  }

  async exportarReportePdf({buscar='',estado=''}={}) {
    const {params,where}=construirFiltrosOrdenesCompra({buscar,estado});
    const res=await pool.query(
      `SELECT
        oc.cod_orden_compra,oc.fecha,oc.moneda,oc.total,oc.observaciones,
        p.nombre_proveedor,
        e.nombre AS estado,
        u.nombre_usuario
       FROM orden_compra oc
       JOIN proveedor p ON oc.cod_proveedor = p.cod_proveedor
       JOIN cat_estado_orden_compra e ON oc.cod_estado_oc = e.cod_estado_oc
       JOIN usuarios u ON oc.cod_usuario = u.cod_usuario
       ${where}
       ORDER BY oc.fecha DESC`,
      params
    );

    const estadoLabel=estado
      ?(res.rows[0]?.estado||estado)
      :'Todos';

    return generarReportePdf({
      titulo:'Reporte de ordenes de compra',
      filtros:[
        {label:'Busqueda',value:buscar||'Todos'},
        {label:'Estado',value:estadoLabel}
      ],
      metricas:[
        {label:'Total de ordenes',value:res.rows.length}
      ],
      columnas:[
        {header:'#',key:'numero',width:28,align:'center'},
        {header:'Orden',key:'orden',width:64},
        {header:'Proveedor',key:'proveedor',width:144},
        {header:'Fecha',key:'fecha',width:72},
        {header:'Moneda',key:'moneda',width:50,align:'center'},
        {header:'Total',key:'total',width:70,align:'right'},
        {header:'Estado',key:'estado',width:76},
        {header:'Usuario',key:'usuario',width:90},
        {header:'Observaciones',key:'observaciones',width:178}
      ],
      filas:res.rows.map((orden,index)=>({
        numero:index+1,
        orden:`OC-${String(orden.cod_orden_compra).padStart(4,'0')}`,
        proveedor:orden.nombre_proveedor,
        fecha:orden.fecha?new Date(orden.fecha).toLocaleDateString('es-HN'):'-',
        moneda:orden.moneda,
        total:`${orden.moneda} ${Number(orden.total||0).toLocaleString('es-HN',{minimumFractionDigits:2})}`,
        estado:orden.estado,
        usuario:orden.nombre_usuario,
        observaciones:orden.observaciones||'-'
      }))
    });
  }

  // Obtener una orden por id con su detalle
  async obtenerPorId(id){
    const [ordenRes,detallesRes]=await Promise.all([
      pool.query(
        `SELECT
          oc.cod_orden_compra,oc.fecha,oc.moneda,oc.total,oc.observaciones,
          p.cod_proveedor,p.nombre_proveedor,
          e.cod_estado_oc,e.nombre AS estado,
          u.nombre_usuario
         FROM orden_compra oc
         JOIN proveedor p ON oc.cod_proveedor = p.cod_proveedor
         JOIN cat_estado_orden_compra e ON oc.cod_estado_oc = e.cod_estado_oc
         JOIN usuarios u ON oc.cod_usuario = u.cod_usuario
         WHERE oc.cod_orden_compra = $1`,
        [id]
      ),
      pool.query(
        `SELECT
          doc.cod_detalle_oc,doc.cod_producto,
          pr.nombre_producto,
          doc.cantidad,doc.precio,doc.isv,doc.subtotal
         FROM detalles_orden_compra doc
         JOIN producto pr ON doc.cod_producto = pr.cod_producto
         WHERE doc.cod_orden_compra = $1`,
        [id]
      )
    ]);

    if(!ordenRes.rows[0]){
      throw Object.assign(new Error('Orden no encontrada'),{statusCode:404});
    }

    return {...ordenRes.rows[0],detalles:detallesRes.rows};
  }

  // Validar detalle antes de guardar
  async _validarDetalles(client,detalles=[]){
    const ids=new Set();

    for(const d of detalles){
      const codProducto=parseInt(d.cod_producto);
      const cantidad=parseFloat(d.cantidad);
      const precio=parseFloat(d.precio);
      const isv=parseFloat(d.isv||0);

      if(!Number.isInteger(codProducto)||codProducto<=0){
        throw Object.assign(new Error('Producto inválido'),{statusCode:400});
      }

      if(ids.has(codProducto)){
        throw Object.assign(new Error('No se permiten productos repetidos en la orden'),{statusCode:400});
      }
      ids.add(codProducto);

      if(!Number.isFinite(cantidad)||cantidad<=0){
        throw Object.assign(new Error('Cantidad inválida'),{statusCode:400});
      }

      if(!Number.isFinite(precio)||precio<0){
        throw Object.assign(new Error('Precio inválido'),{statusCode:400});
      }

      if(!Number.isFinite(isv)||isv<0){
        throw Object.assign(new Error('ISV inválido'),{statusCode:400});
      }

      // Verificar que el producto exista y esté activo
      const prodRes=await client.query(
        `SELECT cod_producto
         FROM producto
         WHERE cod_producto = $1 AND estado_producto = 'Activo'
         LIMIT 1`,
        [codProducto]
      );

      if(!prodRes.rows.length){
        throw Object.assign(new Error(`Producto no válido: ${codProducto}`),{statusCode:400});
      }
    }
  }

  // Crear una nueva orden
  async crear({cod_proveedor,moneda='HNL',observaciones,detalles,cod_usuario}){
    if(!detalles?.length){
      throw Object.assign(new Error('Debe incluir al menos un producto'),{statusCode:400});
    }

    const monedaFinal=(moneda||'').toUpperCase().trim();

    const client=await pool.connect();
    try{
      await client.query('BEGIN');

      // Validar proveedor existente
      const proveedorRes=await client.query(
        `SELECT cod_proveedor
         FROM proveedor
         WHERE cod_proveedor = $1
         LIMIT 1`,
        [cod_proveedor]
      );

      if(!proveedorRes.rows.length){
        throw Object.assign(new Error('Proveedor no válido'),{statusCode:400});
      }

      // Validar detalle y productos
      await this._validarDetalles(client,detalles);

      // Recalcular subtotales y total en servidor
      const detallesLimpios=detalles.map(d=>{
        const cantidad=parseFloat(d.cantidad);
        const precio=parseFloat(d.precio);
        const isv=parseFloat(d.isv||0);
        const subtotal=parseFloat(((precio+isv)*cantidad).toFixed(2));

        return {
          cod_producto:parseInt(d.cod_producto),
          cantidad,
          precio,
          isv,
          subtotal
        };
      });

      const total=detallesLimpios.reduce((s,d)=>s+d.subtotal,0);

      const {rows:[{cod_orden_compra}]}=await client.query(
        `INSERT INTO orden_compra
          (cod_proveedor,cod_usuario,cod_estado_oc,moneda,total,observaciones)
         VALUES ($1,$2,1,$3,$4,$5)
         RETURNING cod_orden_compra`,
        [cod_proveedor,cod_usuario,monedaFinal,total.toFixed(2),observaciones||null]
      );

      await client.query(
        `INSERT INTO estado_orden_compra
          (cod_orden_compra,cod_estado_oc,observaciones)
         VALUES ($1,1,'Orden creada')`,
        [cod_orden_compra]
      );

      for(const d of detallesLimpios){
        await client.query(
          `INSERT INTO detalles_orden_compra
            (cod_orden_compra,cod_producto,cantidad,precio,isv,subtotal)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [cod_orden_compra,d.cod_producto,d.cantidad,d.precio,d.isv,d.subtotal.toFixed(2)]
        );
      }

      await client.query('COMMIT');
      return this.obtenerPorId(cod_orden_compra);
    }catch(err){
      await client.query('ROLLBACK');
      throw err;
    }finally{
      client.release();
    }
  }

  // Sumar stock al aprobar orden
  async _sumarStock(client,detalles){
    const ubicRes=await client.query(`SELECT cod_ubicacion FROM ubicacion LIMIT 1`);
    const cod_ubicacion=ubicRes.rows[0]?.cod_ubicacion||null;

    for(const d of detalles){
      const cantidad=parseInt(d.cantidad);
      const existe=await client.query(
        `SELECT cod_inventario FROM inventario WHERE cod_producto = $1 LIMIT 1`,
        [d.cod_producto]
      );

      if(existe.rows.length){
        await client.query(
          `UPDATE inventario
           SET stock = stock + $1,fecha_ult_mov = NOW()
           WHERE cod_producto = $2`,
          [cantidad,d.cod_producto]
        );
      }else if(cod_ubicacion){
        await client.query(
          `INSERT INTO inventario
            (cod_producto,cod_ubicacion,stock,stock_minimo,stock_maximo,fecha_ult_mov)
           VALUES ($1,$2,$3,0,9999,NOW())`,
          [d.cod_producto,cod_ubicacion,cantidad]
        );
      }
    }
  }

  // Restar stock al cancelar una orden aprobada
  async _restarStock(client,detalles){
    for(const d of detalles){
      const cantidad=parseInt(d.cantidad);
      await client.query(
        `UPDATE inventario
         SET stock = GREATEST(stock - $1,0),fecha_ult_mov = NOW()
         WHERE cod_producto = $2`,
        [cantidad,d.cod_producto]
      );
    }
  }

  // Cambiar estado de la orden
  async cambiarEstado(id,{cod_estado_oc,observaciones}){
    const orden=await this.obtenerPorId(id);

    if([4,5].includes(parseInt(orden.cod_estado_oc))){
      throw Object.assign(new Error('No se puede cambiar el estado de una orden finalizada'),{statusCode:400});
    }

    const nuevoEstado=parseInt(cod_estado_oc);
    const estadoAnterior=parseInt(orden.cod_estado_oc);

    const client=await pool.connect();
    try{
      await client.query('BEGIN');

      await client.query(
        `UPDATE orden_compra SET cod_estado_oc = $1 WHERE cod_orden_compra = $2`,
        [nuevoEstado,id]
      );

      await client.query(
        `INSERT INTO estado_orden_compra
          (cod_orden_compra,cod_estado_oc,observaciones)
         VALUES ($1,$2,$3)`,
        [id,nuevoEstado,observaciones||null]
      );

      if(nuevoEstado===2){
        await this._sumarStock(client,orden.detalles);
      }

      if(nuevoEstado===5&&estadoAnterior===2){
        await this._restarStock(client,orden.detalles);
      }

      await client.query('COMMIT');
      return this.obtenerPorId(id);
    }catch(err){
      await client.query('ROLLBACK');
      throw err;
    }finally{
      client.release();
    }
  }

  // Historial de estados
  async obtenerHistorial(id){
    const res=await pool.query(
      `SELECT
        eoc.cod_est_orden_compra,eoc.fecha,eoc.observaciones,
        e.nombre AS estado
       FROM estado_orden_compra eoc
       JOIN cat_estado_orden_compra e ON eoc.cod_estado_oc = e.cod_estado_oc
       WHERE eoc.cod_orden_compra = $1
       ORDER BY eoc.fecha ASC`,
      [id]
    );
    return res.rows;
  }

  // Listar catálogo de estados
  async listarEstados(){
    const res=await pool.query(
      `SELECT cod_estado_oc,nombre,orden
       FROM cat_estado_orden_compra
       ORDER BY orden`
    );
    return res.rows;
  }

  // Eliminar orden cancelada
  async eliminar(id){
    const client=await pool.connect();
    try{
      await client.query('BEGIN');

      const check=await client.query(
        `SELECT cod_estado_oc
         FROM orden_compra
         WHERE cod_orden_compra = $1`,
        [id]
      );

      if(!check.rows.length) throw new Error('Orden no encontrada');
      if(parseInt(check.rows[0].cod_estado_oc)!==5){
        throw new Error('Solo se pueden eliminar órdenes canceladas');
      }

      await client.query(`DELETE FROM estado_orden_compra WHERE cod_orden_compra = $1`,[id]);
      await client.query(`DELETE FROM detalles_orden_compra WHERE cod_orden_compra = $1`,[id]);
      await client.query(`DELETE FROM orden_compra WHERE cod_orden_compra = $1`,[id]);

      await client.query('COMMIT');
    }catch(err){
      await client.query('ROLLBACK');
      throw err;
    }finally{
      client.release();
    }
  }

  // Productos activos disponibles para compra
  async productosDisponibles(buscar=''){
    const res=buscar?.trim()
      ?await pool.query(
        `SELECT
          p.cod_producto,p.nombre_producto,p.precio_venta,
          COALESCE(i.porcentaje,0) AS isv_porcentaje
         FROM producto p
         LEFT JOIN catalogo_isv i ON p.cod_isv = i.cod_isv
         WHERE p.estado_producto = 'Activo' AND p.nombre_producto ILIKE $1
         ORDER BY p.nombre_producto
         LIMIT 200`,
        [`%${buscar}%`]
      )
      :await pool.query(
        `SELECT
          p.cod_producto,p.nombre_producto,p.precio_venta,
          COALESCE(i.porcentaje,0) AS isv_porcentaje
         FROM producto p
         LEFT JOIN catalogo_isv i ON p.cod_isv = i.cod_isv
         WHERE p.estado_producto = 'Activo'
         ORDER BY p.nombre_producto
         LIMIT 200`
      );

    return res.rows;
  }
}

export default new OrdenCompraService();
