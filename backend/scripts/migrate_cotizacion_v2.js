import { sequelize } from '../src/config/sequelize.js';

async function migrate() {
  try {
    // Verificar si hay datos
    const [countRes] = await sequelize.query("SELECT count(*) as n FROM cotizacion");
    const n = parseInt(countRes[0].n);
    console.log(`Registros actuales en cotizacion: ${n}`);

    // Eliminar tablas viejas (cascada)
    await sequelize.query("DROP TABLE IF EXISTS detalle_cotizacion CASCADE");
    await sequelize.query("DROP TABLE IF EXISTS cotizacion CASCADE");
    console.log('✅ Tablas viejas eliminadas');

    // Crear tabla cotizacion con estructura completa HU-FAC-08
    await sequelize.query(`
      CREATE TABLE cotizacion (
        cod_cotizacion SERIAL PRIMARY KEY,
        cod_cliente INTEGER NOT NULL REFERENCES clientes(cod_cliente),
        cod_usuario INTEGER NOT NULL REFERENCES usuarios(cod_usuario),
        subtotal DECIMAL(10,2) DEFAULT 0,
        descuento DECIMAL(10,2) DEFAULT 0,
        descuento_global DECIMAL(10,2) DEFAULT 0,
        tipo_descuento_global TEXT,
        monto_descuento_global DECIMAL(10,2) DEFAULT 0,
        isv DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) DEFAULT 0,
        estado_cotizacion TEXT DEFAULT 'VIGENTE',
        vigencia_dias INTEGER DEFAULT 15,
        fecha_vencimiento TIMESTAMPTZ,
        observaciones TEXT,
        cod_factura INTEGER REFERENCES factura(cod_factura),
        estado BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla cotizacion creada correctamente');

    // Crear tabla detalle_cotizacion
    await sequelize.query(`
      CREATE TABLE detalle_cotizacion (
        cod_detalle_cotizacion SERIAL PRIMARY KEY,
        cod_cotizacion INTEGER NOT NULL REFERENCES cotizacion(cod_cotizacion) ON DELETE CASCADE,
        tipo_item TEXT NOT NULL DEFAULT 'PRODUCTO',
        cod_producto INTEGER REFERENCES producto(cod_producto),
        cantidad INTEGER NOT NULL,
        precio_unitario DECIMAL(10,2) NOT NULL,
        tipo_descuento TEXT NOT NULL DEFAULT 'PORCENTAJE',
        descuento DECIMAL(10,2) NOT NULL DEFAULT 0,
        monto_descuento DECIMAL(10,2) NOT NULL DEFAULT 0,
        isv DECIMAL(10,2) NOT NULL DEFAULT 0,
        subtotal DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        "createdAt" TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla detalle_cotizacion creada correctamente');

    // Índices
    await sequelize.query("CREATE INDEX idx_cotizacion_cliente ON cotizacion(cod_cliente)");
    await sequelize.query("CREATE INDEX idx_cotizacion_estado ON cotizacion(estado_cotizacion)");
    await sequelize.query("CREATE INDEX idx_det_cotizacion_cot ON detalle_cotizacion(cod_cotizacion)");
    console.log('✅ Índices creados correctamente');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

migrate();
