import { sequelize } from '../config/sequelize.js';

// // Cache simple para no consultar information_schema en cada operacion
let cacheSchemaReservas = null;

// // Resuelve la primera columna existente segun prioridad de candidatos
const resolverColumna = (columnasSet, candidatos = []) => {
  for (const nombre of candidatos) {
    if (columnasSet.has(nombre)) return nombre;
  }
  return null;
};

// // Resuelve la primera tabla existente segun prioridad de nombres candidatos
const resolverTabla = (tablasSet, candidatos = []) => {
  for (const nombre of candidatos) {
    if (tablasSet.has(nombre)) return nombre;
  }
  return null;
};

class InventarioReservasSchemaService {
  // // Obtiene schema real de reservas para operar sin asumir nombres fijos de tabla/columnas
  async obtenerSchemaReservas({ forceRefresh = false } = {}) {
    if (!forceRefresh && cacheSchemaReservas) {
      return cacheSchemaReservas;
    }

    // // Consultamos tablas publicas para identificar la estructura de reservas disponible
    const tablas = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    const tablasSet = new Set((tablas || []).map((t) => t.table_name));
    const tablaReservas = resolverTabla(tablasSet, [
      'reserva_inventario',
      'inventario_reserva',
      'reservas_inventario'
    ]);

    // // Si no existe tabla de reservas se marca como no compatible para esta HU
    if (!tablaReservas) {
      const schemaIncompatible = {
        compatible: false,
        reason: 'No existe tabla de reservas de inventario en el schema actual',
        table: null
      };
      cacheSchemaReservas = schemaIncompatible;
      return schemaIncompatible;
    }

    // // Leemos columnas reales para mapear aliases usados por diferentes esquemas
    const columnas = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = :tableName
      ORDER BY ordinal_position ASC
    `, {
      replacements: { tableName: tablaReservas },
      type: sequelize.QueryTypes.SELECT
    });

    const columnasSet = new Set((columnas || []).map((c) => c.column_name));
    const schema = {
      compatible: true,
      reason: null,
      tableName: tablaReservas,
      columns: (columnas || []).map((c) => c.column_name),
      pk: resolverColumna(columnasSet, ['cod_reserva_inventario', 'cod_reserva', 'id_reserva']),
      codInventario: resolverColumna(columnasSet, ['cod_inventario']),
      codProducto: resolverColumna(columnasSet, ['cod_producto']),
      codUbicacion: resolverColumna(columnasSet, ['cod_ubicacion']),
      cantidad: resolverColumna(columnasSet, ['cantidad', 'cant']),
      estado: resolverColumna(columnasSet, ['estado', 'estado_reserva']),
      fechaCreacion: resolverColumna(columnasSet, ['fecha', 'fecha_creacion', 'created_at']),
      fechaLiberacion: resolverColumna(columnasSet, ['fecha_liberacion', 'liberado_en']),
      fechaConsumo: resolverColumna(columnasSet, ['fecha_consumo', 'consumido_en']),
      codUsuarioCreacion: resolverColumna(columnasSet, ['cod_usuario_creacion', 'cod_usuario', 'id_usuario']),
      codUsuarioLiberacion: resolverColumna(columnasSet, ['cod_usuario_liberacion', 'id_usuario_liberacion']),
      codUsuarioConsumo: resolverColumna(columnasSet, ['cod_usuario_consumo', 'id_usuario_consumo']),
      referencia: resolverColumna(columnasSet, ['referencia', 'referencia_externa', 'codigo_referencia']),
      observaciones: resolverColumna(columnasSet, ['observaciones', 'descripcion', 'detalle']),
      motivoLiberacion: resolverColumna(columnasSet, ['motivo_liberacion', 'motivo'])
    };

    // // Validacion minima de columnas funcionales requeridas para reservas
    const faltantes = [];
    if (!schema.pk) faltantes.push('pk reserva');
    if (!schema.cantidad) faltantes.push('cantidad');
    if (!schema.estado) faltantes.push('estado');
    if (!schema.codInventario && (!schema.codProducto || !schema.codUbicacion)) {
      faltantes.push('cod_inventario o (cod_producto + cod_ubicacion)');
    }

    if (faltantes.length > 0) {
      schema.compatible = false;
      schema.reason = `Tabla de reservas incompleta: faltan ${faltantes.join(', ')}`;
    }

    cacheSchemaReservas = schema;
    return schema;
  }

  // // Limpia cache para refrescar metadatos cuando cambie schema sin reiniciar proceso
  limpiarCache() {
    cacheSchemaReservas = null;
  }
}

export default new InventarioReservasSchemaService();
