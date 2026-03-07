import { sequelize } from '../src/config/sequelize.js';

async function check() {
  const [rows] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name='cotizacion' ORDER BY ordinal_position");
  console.log('Columnas cotizacion:', rows.map(r => r.column_name));
  process.exit(0);
}
check().catch(e => { console.error(e.message); process.exit(1); });
