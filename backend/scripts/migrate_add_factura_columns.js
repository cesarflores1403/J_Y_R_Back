import dotenv from 'dotenv';
dotenv.config();

const { sequelize } = await import('../src/config/sequelize.js');

const queries = [
  `ALTER TABLE factura ADD COLUMN IF NOT EXISTS cai varchar(50);`,
  `ALTER TABLE factura ADD COLUMN IF NOT EXISTS rango_autorizado varchar(100);`,
  `ALTER TABLE factura ADD COLUMN IF NOT EXISTS fecha_limite_emision date;`,
  `ALTER TABLE factura ADD COLUMN IF NOT EXISTS valor_en_letras varchar(300);`,
  `ALTER TABLE factura ADD COLUMN IF NOT EXISTS observaciones varchar(300);`,
  `ALTER TABLE factura ADD COLUMN IF NOT EXISTS garantia_filtracion_agua boolean;`,
  `ALTER TABLE factura ADD COLUMN IF NOT EXISTS firma varchar(100);`
];

try {
  console.log('Conectando a BD...');
  await sequelize.authenticate();
  console.log('Conectado. Ejecutando ALTER TABLE...');
  for (const q of queries) {
    console.log('>', q);
    await sequelize.query(q);
  }
  console.log('Migración completada.');
  process.exit(0);
} catch (err) {
  console.error('Error migration:', err.message);
  process.exit(1);
}
