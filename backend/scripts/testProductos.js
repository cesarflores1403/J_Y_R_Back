import dotenv from 'dotenv';
dotenv.config();

const { sequelize } = await import('../src/config/sequelize.js');

try {
  await sequelize.authenticate();
  console.log('✅ Conectado');

  // 1. Ver si hay productos en la tabla
  const todos = await sequelize.query(
    "SELECT cod_producto, nombre_producto, estado_producto FROM producto LIMIT 10",
    { type: sequelize.QueryTypes.SELECT }
  );
  console.log('\n📦 Primeros 10 productos:', JSON.stringify(todos, null, 2));

  // 2. Buscar "rines"
  const rines = await sequelize.query(
    "SELECT cod_producto, nombre_producto FROM producto WHERE nombre_producto ILIKE '%rines%' LIMIT 5",
    { type: sequelize.QueryTypes.SELECT }
  );
  console.log('\n🔍 Productos con "rines":', JSON.stringify(rines, null, 2));

  // 3. Verificar inventario
  const inv = await sequelize.query(
    "SELECT i.cod_producto, p.nombre_producto, i.stock FROM inventario i JOIN producto p ON i.cod_producto = p.cod_producto LIMIT 10",
    { type: sequelize.QueryTypes.SELECT }
  );
  console.log('\n📊 Inventario (10):', JSON.stringify(inv, null, 2));

  process.exit(0);
} catch (e) {
  console.error('❌ Error:', e.message);
  process.exit(1);
}
