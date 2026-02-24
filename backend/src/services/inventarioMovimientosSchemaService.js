import { sequelize } from '../config/sequelize.js';

// // Cache simple en memoria para evitar consultar information_schema en cada request
let cacheSchemaMovimientos = null;

// // Busca la primera coincidencia de columna segun una lista de candidatos
const resolverColumna = (columnasSet, candidatos = []) => {
  // // Recorremos en orden de prioridad y devolvemos la primera columna existente
  for (const nombre of candidatos) {
    if (columnasSet.has(nombre)) return nombre;
  }
  // // Si ninguna coincide devolvemos null para manejo del caller
  return null;
};

// // Construye un error controlado para discrepancias de schema en movimientos
const crearErrorSchema = (message) => {
  // // Usamos status 500 por tratarse de configuracion/schema inesperado en servidor
  return Object.assign(new Error(message), { status: 500 });
};

class InventarioMovimientosSchemaService {
  // // Lee columnas reales de movimiento_inventario desde information_schema y las mapea
  async obtenerSchemaMovimiento({ forceRefresh = false } = {}) {
    // // Reutilizamos cache mientras no se solicite refresh explicito
    if (!forceRefresh && cacheSchemaMovimientos) {
      return cacheSchemaMovimientos;
    }

    // // Consultamos columnas de la tabla de movimientos del kardex
    const columnas = await sequelize.query(`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'movimiento_inventario'
      ORDER BY ordinal_position ASC
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    // // Si no existe la tabla, dejamos error claro para despliegue/manual setup
    if (!Array.isArray(columnas) || columnas.length === 0) {
      throw crearErrorSchema(
        'Tabla movimiento_inventario no encontrada en la BD. Pendiente manual: crear schema de kardex antes de usar HU3/HU4.'
      );
    }

    // // Preparamos set de nombres para resolver candidatos por alias comunes
    const columnasSet = new Set(columnas.map((c) => c.column_name));

    // // Resolvemos columnas clave minimas para kardex y registro de entradas
    const schema = {
      tableName: 'movimiento_inventario',
      columns: columnas.map((c) => c.column_name),
      // // PK del movimiento (si existe con nombres esperados)
      pk: resolverColumna(columnasSet, ['cod_mov_inventario', 'cod_movimiento', 'id_movimiento']),
      // // Referencia a inventario y/o producto/ubicacion (segun schema real)
      codInventario: resolverColumna(columnasSet, ['cod_inventario']),
      codProducto: resolverColumna(columnasSet, ['cod_producto']),
      codUbicacion: resolverColumna(columnasSet, ['cod_ubicacion']),
      // // Usuario que registro el movimiento (opcional)
      codUsuario: resolverColumna(columnasSet, ['cod_usuario', 'id_usuario']),
      // // Campos funcionales del kardex (obligatorios para HU3/HU4)
      tipo: resolverColumna(columnasSet, ['tipo_movimiento', 'tipo_mov', 'tipo']),
      cantidad: resolverColumna(columnasSet, ['cantidad', 'cant']),
      fecha: resolverColumna(columnasSet, ['fecha_movimiento', 'fecha_mov', 'fecha', 'creado_en', 'created_at']),
      // // Referencia de documento y observaciones (opcionales, con fallback)
      referencia: resolverColumna(columnasSet, [
        'referencia_documento',
        'referencia',
        'doc_referencia',
        'documento_referencia',
        'num_documento',
        'n_documento'
      ]),
      observaciones: resolverColumna(columnasSet, ['observaciones', 'observacion', 'descripcion', 'detalle'])
    };

    // // Validamos campos minimos para soportar kardex y entradas
    if (!schema.tipo || !schema.cantidad || !schema.fecha) {
      throw crearErrorSchema(
        'Schema de movimiento_inventario incompleto: se requieren columnas de tipo, cantidad y fecha para HU3/HU4.'
      );
    }

    // // Debe existir forma de vincular movimiento a producto/ubicacion o inventario
    const tieneVinculoDirecto = schema.codProducto && schema.codUbicacion;
    const tieneVinculoInventario = schema.codInventario;
    if (!tieneVinculoDirecto && !tieneVinculoInventario) {
      throw crearErrorSchema(
        'Schema de movimiento_inventario incompatible: se requiere cod_inventario o el par cod_producto/cod_ubicacion.'
      );
    }

    // // Guardamos cache para reutilizar en requests posteriores
    cacheSchemaMovimientos = schema;
    return schema;
  }

  // // Permite limpiar cache si en despliegue se cambia schema sin reiniciar proceso
  limpiarCache() {
    cacheSchemaMovimientos = null;
  }
}

export default new InventarioMovimientosSchemaService();
