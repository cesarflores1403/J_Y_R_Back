// =====================================================
// HU-FAC-07: Migración — Crear tabla bitacora_anulacion
// Ejecutar: node backend/scripts/migrate_bitacora_anulacion.js
// =====================================================
import { sequelize } from '../src/config/sequelize.js';

const run = async () => {
  try {
    console.log('🔄 Creando tabla bitacora_anulacion...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS bitacora_anulacion (
        cod_bitacora        SERIAL PRIMARY KEY,
        cod_factura          INTEGER NOT NULL REFERENCES factura(cod_factura),
        cod_usuario          INTEGER NOT NULL REFERENCES usuarios(cod_usuario),
        motivo               TEXT NOT NULL,
        fecha_anulacion      TIMESTAMP DEFAULT NOW(),
        inventario_reversado BOOLEAN DEFAULT false,
        pagos_reversados     INTEGER DEFAULT 0,
        monto_pagos_reversados DECIMAL(10,2) DEFAULT 0,
        detalle_json         TEXT,
        "createdAt"          TIMESTAMP DEFAULT NOW(),
        "updatedAt"          TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ Tabla bitacora_anulacion creada correctamente');

    // Agregar columna motivo_anulacion a factura si no existe
    await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='factura' AND column_name='motivo_anulacion') THEN
          ALTER TABLE factura ADD COLUMN motivo_anulacion TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='factura' AND column_name='anulada_por') THEN
          ALTER TABLE factura ADD COLUMN anulada_por INTEGER REFERENCES usuarios(cod_usuario);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='factura' AND column_name='fecha_anulacion') THEN
          ALTER TABLE factura ADD COLUMN fecha_anulacion TIMESTAMP;
        END IF;
      END
      $$;
    `);

    console.log('✅ Columnas motivo_anulacion, anulada_por, fecha_anulacion agregadas a factura');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    process.exit(1);
  }
};

run();
