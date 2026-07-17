// Auditoría de calidad de datos de clientes (SOLO LECTURA).
// No modifica nada: cuenta y lista los registros que incumplen las nuevas
// validaciones del sistema, y estima cuántos se pueden corregir de forma
// automática y segura vs. cuántos requieren revisión manual (p. ej. DNI ausente).
//
// Uso:
//   node scripts/auditClientes.mjs

import { sequelize } from '../src/config/sequelize.js';
import { validarCliente, normalizarCliente } from './lib/validacionClientes.mjs';

const CAMPOS = ['cod_cliente', 'nombre', 'apellido', 'dni', 'rtn', 'empresa', 'telefono', 'correo', 'direccion'];

async function main() {
  await sequelize.authenticate();

  const clientes = await sequelize.query(
    `SELECT ${CAMPOS.join(', ')} FROM clientes ORDER BY cod_cliente ASC`,
    { type: sequelize.QueryTypes.SELECT }
  );

  const total = clientes.length;
  const invalidos = [];
  const conteoPorRegla = {};
  let corregiblesAuto = 0;

  for (const c of clientes) {
    const errores = validarCliente(c);
    if (errores.length === 0) continue;

    // ¿Basta con la normalización segura para dejarlo válido?
    const { valores } = normalizarCliente(c);
    const erroresTrasNormalizar = validarCliente({ ...c, ...valores });
    const autoCorregible = erroresTrasNormalizar.length === 0;
    if (autoCorregible) corregiblesAuto++;

    for (const e of errores) conteoPorRegla[e] = (conteoPorRegla[e] || 0) + 1;

    invalidos.push({
      cod_cliente: c.cod_cliente,
      errores,
      resueltoConNormalizacion: autoCorregible,
      requiereRevisionManual: !autoCorregible ? erroresTrasNormalizar : []
    });
  }

  console.log('\n===== AUDITORÍA DE CLIENTES =====');
  console.log(`Total de clientes:              ${total}`);
  console.log(`Clientes válidos:               ${total - invalidos.length}`);
  console.log(`Clientes con problemas:         ${invalidos.length}`);
  console.log(`  · Corregibles automáticamente: ${corregiblesAuto}`);
  console.log(`  · Requieren revisión manual:   ${invalidos.length - corregiblesAuto}`);

  console.log('\n----- Incidencias por regla -----');
  Object.entries(conteoPorRegla)
    .sort((a, b) => b[1] - a[1])
    .forEach(([regla, n]) => console.log(`  ${String(n).padStart(5)}  ${regla}`));

  const manuales = invalidos.filter((i) => !i.resueltoConNormalizacion);
  if (manuales.length) {
    console.log('\n----- Requieren revisión manual (no se pueden autocompletar) -----');
    for (const m of manuales) {
      console.log(`  cod_cliente=${m.cod_cliente}  ->  ${m.requiereRevisionManual.join(', ')}`);
    }
  }

  console.log('\nNota: los DNI o identidades ausentes NO se pueden inventar; se listan');
  console.log('arriba para completarlos manualmente con la fuente de datos real.\n');

  await sequelize.close();
}

main().catch(async (err) => {
  console.error('Error en la auditoría:', err);
  try { await sequelize.close(); } catch {}
  process.exit(1);
});
