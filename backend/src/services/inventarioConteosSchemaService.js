import { sequelize } from '../config/sequelize.js';

// // Cache en memoria para evitar consultas repetitivas a information_schema en cada request
let cacheSchemaConteos = null;

// // Busca la primera coincidencia de columna en orden de prioridad
const resolverColumna = (columnasSet, candidatos = []) => {
  for (const nombre of candidatos) {
    if (columnasSet.has(nombre)) return nombre;
  }
  return null;
};

// // Busca la primera tabla existente segun lista de candidatos de nombres
const resolverTabla = (tablasSet, candidatos = []) => {
  for (const nombre of candidatos) {
    if (tablasSet.has(nombre)) return nombre;
  }
  return null;
};

class InventarioConteosSchemaService {
  // // Resuelve encabezado/detalle de conteos fisicos segun schema real disponible en BD
  async obtenerSchemaConteos({ forceRefresh = false } = {}) {
    if (!forceRefresh && cacheSchemaConteos) {
      return cacheSchemaConteos;
    }

    // // Leemos tablas disponibles en schema public para detectar convenciones reales
    const tablas = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    const tablasSet = new Set((tablas || []).map((t) => t.table_name));
    const tablaEncabezado = resolverTabla(tablasSet, [
      'conteo_inventario',
      'inventario_conteo',
      'conteo_fisico'
    ]);
    const tablaDetalle = resolverTabla(tablasSet, [
      'conteo_inventario_detalle',
      'inventario_conteo_detalle',
      'conteo_fisico_detalle'
    ]);

    // // Si no existe encabezado o detalle, marcamos schema no compatible para esta HU
    if (!tablaEncabezado || !tablaDetalle) {
      const schemaIncompatible = {
        compatible: false,
        reason: 'No existen tablas de conteo fisico (encabezado/detalle) en el schema actual',
        header: null,
        detail: null
      };
      cacheSchemaConteos = schemaIncompatible;
      return schemaIncompatible;
    }

    // // Leemos columnas reales de encabezado y detalle para mapear nombres variantes
    const columnasEncabezado = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = :tableName
      ORDER BY ordinal_position ASC
    `, {
      replacements: { tableName: tablaEncabezado },
      type: sequelize.QueryTypes.SELECT
    });
    const columnasDetalle = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = :tableName
      ORDER BY ordinal_position ASC
    `, {
      replacements: { tableName: tablaDetalle },
      type: sequelize.QueryTypes.SELECT
    });

    const setHeader = new Set((columnasEncabezado || []).map((c) => c.column_name));
    const setDetail = new Set((columnasDetalle || []).map((c) => c.column_name));

    // // Mapeo dinamico del encabezado de conteo
    const header = {
      tableName: tablaEncabezado,
      columns: (columnasEncabezado || []).map((c) => c.column_name),
      pk: resolverColumna(setHeader, ['cod_conteo_inventario', 'cod_conteo', 'id_conteo']),
      estado: resolverColumna(setHeader, ['estado', 'estado_conteo']),
      fechaApertura: resolverColumna(setHeader, ['fecha_apertura', 'fecha', 'fecha_creacion', 'created_at']),
      fechaCierre: resolverColumna(setHeader, ['fecha_cierre', 'cerrado_en', 'updated_at']),
      observaciones: resolverColumna(setHeader, ['observaciones', 'descripcion', 'detalle']),
      observacionesCierre: resolverColumna(setHeader, ['observaciones_cierre', 'detalle_cierre']),
      codUsuarioApertura: resolverColumna(setHeader, ['cod_usuario_apertura', 'cod_usuario', 'id_usuario']),
      codUsuarioCierre: resolverColumna(setHeader, ['cod_usuario_cierre', 'id_usuario_cierre'])
    };

    // // Mapeo dinamico del detalle de conteo
    const detail = {
      tableName: tablaDetalle,
      columns: (columnasDetalle || []).map((c) => c.column_name),
      pk: resolverColumna(setDetail, ['cod_conteo_detalle', 'cod_detalle', 'id_detalle']),
      codConteo: resolverColumna(setDetail, ['cod_conteo_inventario', 'cod_conteo', 'id_conteo']),
      codProducto: resolverColumna(setDetail, ['cod_producto']),
      codUbicacion: resolverColumna(setDetail, ['cod_ubicacion']),
      codInventario: resolverColumna(setDetail, ['cod_inventario']),
      stockSistema: resolverColumna(setDetail, ['stock_sistema', 'stock_teorico']),
      stockFisico: resolverColumna(setDetail, ['stock_fisico']),
      diferencia: resolverColumna(setDetail, ['diferencia']),
      observaciones: resolverColumna(setDetail, ['observaciones', 'descripcion', 'detalle']),
      fechaRegistro: resolverColumna(setDetail, ['fecha_registro', 'fecha', 'created_at'])
    };

    // // Validacion minima de compatibilidad funcional de detalle
    const faltantesCriticos = [];
    if (!header.pk) faltantesCriticos.push('pk encabezado');
    if (!detail.codConteo) faltantesCriticos.push('fk detalle->conteo');
    if (!detail.codProducto) faltantesCriticos.push('cod_producto detalle');
    if (!detail.codUbicacion) faltantesCriticos.push('cod_ubicacion detalle');
    if (!detail.stockFisico) faltantesCriticos.push('stock_fisico detalle');

    const compatible = faltantesCriticos.length === 0;
    const schema = {
      compatible,
      reason: compatible ? null : `Schema de conteo incompleto: faltan ${faltantesCriticos.join(', ')}`,
      header,
      detail
    };

    cacheSchemaConteos = schema;
    return schema;
  }

  // // Permite invalidar cache si el schema cambia sin reiniciar proceso
  limpiarCache() {
    cacheSchemaConteos = null;
  }
}

export default new InventarioConteosSchemaService();
