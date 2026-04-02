import dotenv from 'dotenv'; // // Carga variables de entorno

dotenv.config(); // // Carga .env ANTES de importar app

const { default: app } = await import('./app.js'); // // Import dinámico para respetar dotenv
const { default: pool } = await import('./config/db-connection.js'); // // Pool BD (dinámico)
const { sequelize, testSequelizeConnection } = await import('./config/sequelize.js'); // // Sequelize ORM (dinámico)

const PORT = process.env.PORT || 5000; // // Puerto configurable

app.listen(PORT, async () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`); // // Log server
  try {
    await pool.query('SELECT 1'); // // Verificar conexión a BD al arrancar
    console.log('✅ Conectado correctamente a Supabase (pg pool)');
  } catch (err) {
    console.error('❌ Error al conectar a Supabase (pg pool):', err.message);
  }
  try {
    await testSequelizeConnection(); // // Verificar conexión Sequelize
    console.log('✅ Conectado correctamente a Supabase (Sequelize)');

    // // Compatibilidad de esquema para clientes: agregar RTN si no existe
    await sequelize.query('ALTER TABLE clientes ADD COLUMN IF NOT EXISTS rtn VARCHAR(14)');
    console.log('✅ Esquema clientes verificado (rtn)');

    // HU-16: Compatibilidad de esquema para auditoria en producto
    await sequelize.query('ALTER TABLE producto ADD COLUMN IF NOT EXISTS creado_por INTEGER');
    await sequelize.query('ALTER TABLE producto ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMP');
    await sequelize.query('ALTER TABLE producto ADD COLUMN IF NOT EXISTS modificado_por INTEGER');
    await sequelize.query('ALTER TABLE producto ADD COLUMN IF NOT EXISTS fecha_modificacion TIMESTAMP');
    await sequelize.query('ALTER TABLE producto ADD COLUMN IF NOT EXISTS stock_minimo INTEGER');
    await sequelize.query('ALTER TABLE producto ADD COLUMN IF NOT EXISTS punto_reorden INTEGER');
    console.log('✅ Esquema producto verificado (auditoria)');

    // Compatibilidad de esquema para facturación de reparación (descripción manual)
    await sequelize.query('ALTER TABLE detalle_factura ADD COLUMN IF NOT EXISTS descripcion_item TEXT');
    console.log('✅ Esquema detalle_factura verificado (descripcion_item)');
  } catch (err) {
    console.error('❌ Error al conectar Sequelize:', err.message);
  }
});