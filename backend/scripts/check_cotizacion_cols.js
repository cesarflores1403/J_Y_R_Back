import { sequelize } from '../src/config/sequelize.js';

const [rows] = await sequelize.query(
  `SELECT column_name FROM information_schema.columns WHERE table_name='cotizacion' ORDER BY ordinal_position`
);
console.log('Columnas de cotizacion:', rows.map(r => r.column_name).join(', '));
process.exit(0);
