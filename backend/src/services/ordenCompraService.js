import pool from '../config/db-connection.js';
import { Op } from 'sequelize';
import { sequelize } from '../config/sequelize.js';
import ProductoSeq from '../models/ProductoSeq.js';

async function productosDisponibles(buscar = '') {
  let texto = '';

  // Acepta string o { buscar: 'texto' }
  if (typeof buscar === 'string') {
    texto = buscar.trim();
  } else if (buscar && typeof buscar === 'object') {
    texto = String(buscar.buscar || '').trim();
  }

  // Traer productos activos
  const productos = await ProductoSeq.findAll({
    where: {
      estado_producto: 'Activo'
    },
    attributes: ['cod_producto', 'nombre_producto', 'precio_venta', 'cod_isv'],
    order: [['nombre_producto', 'ASC']],
    limit: 200
  });

  // Filtrar en backend (seguro, sin errores de Sequelize)
  const filtrados = texto
    ? productos.filter((p) =>
        String(p.nombre_producto || '').toLowerCase().includes(texto.toLowerCase()) ||
        String(p.cod_producto || '').toLowerCase().includes(texto.toLowerCase())
      )
    : productos;

  const resultado = [];

  for (const producto of filtrados.slice(0, 50)) {
    let isvPorcentaje = 0;

    if (producto.cod_isv) {
      const [isvInfo] = await sequelize.query(
        `SELECT porcentaje FROM catalogo_isv WHERE cod_isv = :codIsv LIMIT 1`,
        {
          replacements: { codIsv: producto.cod_isv },
          type: sequelize.QueryTypes.SELECT
        }
      );

      isvPorcentaje = isvInfo ? parseFloat(isvInfo.porcentaje) : 0;
    }

    resultado.push({
      cod_producto: producto.cod_producto,
      nombre_producto: producto.nombre_producto,
      precio_venta: producto.precio_venta,
      isv_porcentaje: isvPorcentaje
    });
  }

  return resultado;
}
