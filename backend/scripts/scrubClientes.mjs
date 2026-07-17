// Depuración (Data Scrubbing) de clientes.
//
// SEGURIDAD:
//  - Por defecto corre en modo simulación (dry-run): NO escribe nada.
//  - Solo con --apply realiza cambios, y lo hace dentro de UNA transacción
//    (todo o nada).
//  - Solo aplica correcciones deterministas y seguras (trim, minúsculas en
//    correo, quitar separadores de dni/telefono/rtn). NUNCA inventa ni borra
//    identidades: los registros que no quedan válidos tras normalizar se
//    exportan a un CSV para revisión manual y se dejan intactos.
//
// Uso:
//   node scripts/scrubClientes.mjs            # simulación (recomendado primero)
//   node scripts/scrubClientes.mjs --apply    # aplica los cambios seguros
//
// Recomendado: ejecutar antes `npm run backup:system` para tener respaldo.

import { writeFileSync } from 'node:fs';
import { sequelize } from '../src/config/sequelize.js';
import { validarCliente, normalizarCliente } from './lib/validacionClientes.mjs';

const APLICAR = process.argv.includes('--apply');
const CAMPOS = ['cod_cliente', 'nombre', 'apellido', 'dni', 'rtn', 'empresa', 'telefono', 'correo', 'direccion'];
const CAMPOS_ACTUALIZABLES = ['nombre', 'apellido', 'dni', 'rtn', 'empresa', 'telefono', 'correo', 'direccion'];

function aCsv(filas) {
  const cabecera = ['cod_cliente', ...CAMPOS_ACTUALIZABLES, 'errores'];
  const escapar = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lineas = [cabecera.join(',')];
  for (const f of filas) {
    lineas.push(cabecera.map((k) => escapar(f[k])).join(','));
  }
  return lineas.join('\n');
}

async function main() {
  await sequelize.authenticate();
  console.log(`\nModo: ${APLICAR ? 'APLICAR CAMBIOS (--apply)' : 'SIMULACIÓN (dry-run)'}\n`);

  const clientes = await sequelize.query(
    `SELECT ${CAMPOS.join(', ')} FROM clientes ORDER BY cod_cliente ASC`,
    { type: sequelize.QueryTypes.SELECT }
  );

  const aCorregir = [];       // se pueden dejar válidos con normalización segura
  const paraRevisionManual = []; // no se pueden autocompletar (p. ej. DNI ausente)

  for (const c of clientes) {
    const errores = validarCliente(c);
    if (errores.length === 0) continue;

    const { cambiado, valores } = normalizarCliente(c);
    const erroresTrasNormalizar = validarCliente({ ...c, ...valores });

    if (erroresTrasNormalizar.length === 0 && cambiado) {
      aCorregir.push({ cod_cliente: c.cod_cliente, valores });
    } else {
      paraRevisionManual.push({
        cod_cliente: c.cod_cliente,
        ...Object.fromEntries(CAMPOS_ACTUALIZABLES.map((k) => [k, c[k]])),
        errores: erroresTrasNormalizar.join(' | ')
      });
    }
  }

  console.log(`Clientes totales:                 ${clientes.length}`);
  console.log(`A corregir (seguro, automático):  ${aCorregir.length}`);
  console.log(`Para revisión manual (CSV):       ${paraRevisionManual.length}`);

  // Exporta los que necesitan intervención humana (nunca se tocan aquí).
  if (paraRevisionManual.length) {
    const ruta = new URL('./clientes_revision_manual.csv', import.meta.url);
    writeFileSync(ruta, aCsv(paraRevisionManual), 'utf8');
    console.log(`\nCSV de revisión manual: ${ruta.pathname}`);
  }

  if (aCorregir.length && !APLICAR) {
    console.log('\nEjemplos de correcciones que se aplicarían (primeros 10):');
    for (const r of aCorregir.slice(0, 10)) {
      console.log(`  cod_cliente=${r.cod_cliente}  ->  ${JSON.stringify(r.valores)}`);
    }
  }

  if (!APLICAR) {
    console.log('\nSimulación completa. No se modificó ningún registro.');
    console.log('Para aplicar los cambios seguros ejecuta:  node scripts/scrubClientes.mjs --apply\n');
    await sequelize.close();
    return;
  }

  if (aCorregir.length === 0) {
    console.log('\nNo hay correcciones automáticas que aplicar.\n');
    await sequelize.close();
    return;
  }

  // Aplica todo dentro de una única transacción: si algo falla, se revierte todo.
  const t = await sequelize.transaction();
  try {
    for (const r of aCorregir) {
      await sequelize.query(
        `UPDATE clientes
            SET nombre = :nombre, apellido = :apellido, dni = :dni, rtn = :rtn,
                empresa = :empresa, telefono = :telefono, correo = :correo, direccion = :direccion
          WHERE cod_cliente = :cod_cliente`,
        {
          replacements: { cod_cliente: r.cod_cliente, ...r.valores },
          type: sequelize.QueryTypes.UPDATE,
          transaction: t
        }
      );
    }
    await t.commit();
    console.log(`\n✅ ${aCorregir.length} registro(s) corregido(s) correctamente.`);
    console.log(`Quedan ${paraRevisionManual.length} para completar manualmente (ver CSV).\n`);
  } catch (err) {
    await t.rollback();
    console.error('\n❌ Error durante la actualización. Se revirtieron TODOS los cambios.');
    throw err;
  }

  await sequelize.close();
}

main().catch(async (err) => {
  console.error('Error en la depuración:', err);
  try { await sequelize.close(); } catch {}
  process.exit(1);
});
