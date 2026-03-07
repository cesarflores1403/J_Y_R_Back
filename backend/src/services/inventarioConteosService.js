import { sequelize } from '../config/sequelize.js';
import ProductoSeq from '../models/ProductoSeq.js';
import Ubicacion from '../models/Ubicacion.js';
import inventarioMovimientosSchemaService from './inventarioMovimientosSchemaService.js';
import inventarioConteosSchemaService from './inventarioConteosSchemaService.js';
import {
  obtenerSelectInventarioPorProductoUbicacion,
  obtenerSelectInventarioPorId,
  obtenerUpdateInventarioAStockFisico,
  construirInsertConteoSql,
  construirSelectConteoPorIdSql,
  construirSelectDetalleExistenteSql,
  construirInsertDetalleConteoSql,
  construirUpdateDetalleConteoSql,
  construirSelectDetallesConteoSql,
  construirUpdateCerrarConteoSql,
  construirInsertMovimientoAjusteSql
} from './inventarioConteosQueries.js';

// // Detecta error de columna faltante en PostgreSQL (undefined_column)
const esErrorColumnaNoExiste = (error, nombreColumna) => {
  if (!error) return false;
  if (error.code !== '42703') return false;
  const mensaje = String(error.message || error.original?.message || '').toLowerCase();
  return mensaje.includes(String(nombreColumna).toLowerCase());
};

// // Evalua si una ubicacion esta operativa para inventario
const ubicacionActiva = (estadoUbi) => {
  if (estadoUbi === null || estadoUbi === undefined) return true;
  const valor = String(estadoUbi).trim().toUpperCase();
  return ['ACTIVA', 'ACTIVO', '1', 'TRUE'].includes(valor);
};

// // Evalua si un conteo ya esta cerrado usando estado textual y/o fecha de cierre
const esConteoCerrado = ({ conteo, schemaHeader }) => {
  if (!conteo) return false;
  if (schemaHeader.estado) {
    const estado = String(conteo[schemaHeader.estado] || '').trim().toUpperCase();
    if (['CERRADO', 'CERRADA', 'FINALIZADO', 'FINALIZADA', 'CLOSED', 'CLOSE'].includes(estado)) {
      return true;
    }
  }
  if (schemaHeader.fechaCierre) {
    return Boolean(conteo[schemaHeader.fechaCierre]);
  }
  return false;
};

class InventarioConteosService {
  // // Garantiza que el schema de conteos exista y sea compatible antes de operar
  async obtenerSchemaConteosCompatible() {
    const schemaConteos = await inventarioConteosSchemaService.obtenerSchemaConteos();
    if (!schemaConteos?.compatible) {
      throw Object.assign(
        new Error('Estructura de conteos fisicos no disponible en BD. Pendiente manual: crear tablas de conteo (encabezado y detalle).'),
        { status: 500, detalle_schema: schemaConteos?.reason || null }
      );
    }
    return schemaConteos;
  }

  // // Lee encabezado de conteo por id con lock opcional para operaciones concurrentes
  async obtenerConteoPorId({ schemaHeader, codConteo, transaction, forUpdate = false }) {
    const [fila] = await sequelize.query(construirSelectConteoPorIdSql({
      schemaHeader,
      forUpdate
    }), {
      replacements: { codConteo },
      type: sequelize.QueryTypes.SELECT,
      transaction
    });

    return fila || null;
  }

  // // Obtiene inventario por producto+ubicacion con fallback cuando stock_reservado no existe
  async obtenerInventarioPorProductoUbicacion({ codProducto, codUbicacion, transaction, forUpdate = false }) {
    try {
      const [fila] = await sequelize.query(obtenerSelectInventarioPorProductoUbicacion({
        usarStockReservado: true,
        forUpdate
      }), {
        replacements: { codProducto, codUbicacion },
        type: sequelize.QueryTypes.SELECT,
        transaction
      });

      return {
        inventario: fila || null,
        usaStockReservado: true
      };
    } catch (error) {
      if (!esErrorColumnaNoExiste(error, 'stock_reservado')) {
        throw error;
      }

      const [fila] = await sequelize.query(obtenerSelectInventarioPorProductoUbicacion({
        usarStockReservado: false,
        forUpdate
      }), {
        replacements: { codProducto, codUbicacion },
        type: sequelize.QueryTypes.SELECT,
        transaction
      });

      return {
        inventario: fila || null,
        usaStockReservado: false
      };
    }
  }

  // // Obtiene inventario por id con lock opcional durante cierre de conteo
  async obtenerInventarioPorId({ codInventario, usaStockReservado, transaction, forUpdate = false }) {
    const [fila] = await sequelize.query(obtenerSelectInventarioPorId({
      usarStockReservado: usaStockReservado,
      forUpdate
    }), {
      replacements: { codInventario },
      type: sequelize.QueryTypes.SELECT,
      transaction
    });

    return fila || null;
  }

  // // Inserta movimiento de ajuste en kardex (AJUSTE+ o AJUSTE- codificado en motivo)
  async insertarMovimientoAjuste({
    schemaMovimiento,
    codInventario,
    codProducto,
    codUbicacion,
    codUsuario,
    cantidad,
    tipoAjuste,
    codConteo,
    observaciones,
    transaction
  }) {
    const motivo = `CONTEO_FISICO_${tipoAjuste}`;
    const referencia = `CONTEO-${codConteo}`;
    const { sql, replacements } = construirInsertMovimientoAjusteSql({
      schemaMovimiento,
      codInventario,
      codProducto,
      codUbicacion,
      codUsuario,
      cantidad,
      motivo,
      referencia,
      observaciones,
      refTipo: 'CONTEO_INVENTARIO',
      refId: codConteo
    });

    const [filas] = await sequelize.query(sql, {
      replacements,
      transaction
    });

    const movimiento = Array.isArray(filas) ? filas[0] : null;
    return movimiento || null;
  }

  // // Abre encabezado de conteo fisico en estado inicial ABIERTO
  async abrirConteo(payload, options = {}) {
    const schemaConteos = await this.obtenerSchemaConteosCompatible();
    const { header: schemaHeader } = schemaConteos;
    const observaciones = payload?.observaciones ? String(payload.observaciones).trim() : '';
    const codUsuario = options?.usuario?.cod_usuario ? Number(options.usuario.cod_usuario) : null;

    const t = await sequelize.transaction();
    let transaccionConfirmada = false;

    try {
      // // Construimos INSERT dinamico de encabezado segun columnas reales detectadas
      const { sql, replacements } = construirInsertConteoSql({
        schemaHeader,
        codUsuario,
        observaciones
      });

      // // Si no hay columnas insertables, el schema no permite apertura programatica
      if (!sql.includes('(') || !sql.includes('VALUES')) {
        throw Object.assign(new Error('Schema de encabezado de conteo no soporta apertura automatica'), { status: 500 });
      }

      const [filas] = await sequelize.query(sql, {
        replacements,
        transaction: t
      });

      const conteoRow = Array.isArray(filas) ? filas[0] : null;
      const codConteo = schemaHeader.pk ? Number(conteoRow?.[schemaHeader.pk]) : null;
      if (!codConteo) {
        throw Object.assign(new Error('No fue posible identificar el conteo creado'), { status: 500 });
      }

      await t.commit();
      transaccionConfirmada = true;

      return {
        conteo: conteoRow,
        resumen: {
          cod_conteo: codConteo,
          estado: schemaHeader.estado ? (conteoRow?.[schemaHeader.estado] ?? 'ABIERTO') : 'ABIERTO'
        }
      };
    } catch (error) {
      if (!transaccionConfirmada) {
        await t.rollback();
      }
      throw error;
    }
  }

  // // Captura (o actualiza) detalle fisico por producto+ubicacion en un conteo abierto
  async registrarDetalleConteo(codConteo, payload, options = {}) {
    const schemaConteos = await this.obtenerSchemaConteosCompatible();
    const { header: schemaHeader, detail: schemaDetail } = schemaConteos;
    const codProducto = Number(payload.cod_producto);
    const codUbicacion = Number(payload.cod_ubicacion);
    const stockFisico = Number(payload.stock_fisico);
    const observaciones = payload?.observaciones ? String(payload.observaciones).trim() : '';

    // // Defensa en profundidad para evitar entradas invalidas fuera del validator
    if (!Number.isInteger(stockFisico) || stockFisico < 0) {
      throw Object.assign(new Error('stock_fisico debe ser numerico entero mayor o igual a 0'), { status: 400 });
    }

    const t = await sequelize.transaction();
    let transaccionConfirmada = false;

    try {
      // // Bloqueamos encabezado para impedir captura simultanea contra cierre concurrente
      const conteo = await this.obtenerConteoPorId({
        schemaHeader,
        codConteo,
        transaction: t,
        forUpdate: true
      });
      if (!conteo) {
        throw Object.assign(new Error('Conteo no encontrado'), { status: 404 });
      }
      if (esConteoCerrado({ conteo, schemaHeader })) {
        throw Object.assign(new Error('No se puede capturar detalle en un conteo cerrado'), { status: 409 });
      }

      // // Validamos existencia de producto y ubicacion para evitar detalles huerfanos
      const producto = await ProductoSeq.findByPk(codProducto, { transaction: t });
      if (!producto) {
        throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
      }
      const ubicacion = await Ubicacion.findByPk(codUbicacion, { transaction: t });
      if (!ubicacion) {
        throw Object.assign(new Error('Ubicacion no encontrada'), { status: 404 });
      }
      if (!ubicacionActiva(ubicacion.estado_ubi)) {
        throw Object.assign(new Error('La ubicacion no esta activa para conteo fisico'), { status: 400 });
      }

      // // Tomamos snapshot de stock sistema actual de inventario para calcular diferencia inicial
      const inventarioLookup = await this.obtenerInventarioPorProductoUbicacion({
        codProducto,
        codUbicacion,
        transaction: t,
        forUpdate: false
      });
      const inventario = inventarioLookup.inventario;
      if (!inventario) {
        throw Object.assign(new Error('Inventario no encontrado para producto y ubicacion indicados'), { status: 404 });
      }

      const codInventario = Number(inventario.cod_inventario);
      const stockSistema = Number(inventario.stock || 0);
      const diferencia = stockFisico - stockSistema;

      // // Buscamos si ya existe detalle para actualizarlo en lugar de duplicar
      const [detalleExistente] = await sequelize.query(construirSelectDetalleExistenteSql({ schemaDetail }), {
        replacements: {
          codConteo,
          codProducto,
          codUbicacion
        },
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      });

      let detalleRow = null;
      let accion = 'insertado';

      if (detalleExistente) {
        // // Regla adoptada: duplicado se resuelve como UPDATE del mismo detalle
        if (!schemaDetail.pk) {
          throw Object.assign(
            new Error('No se puede actualizar detalle duplicado porque la tabla no expone PK de detalle'),
            { status: 409 }
          );
        }

        const pkDetalle = detalleExistente[schemaDetail.pk];
        const { sql, replacements } = construirUpdateDetalleConteoSql({
          schemaDetail,
          pkDetalle,
          codInventario,
          stockSistema,
          stockFisico,
          diferencia,
          observaciones
        });

        const [filas] = await sequelize.query(sql, {
          replacements,
          transaction: t
        });

        detalleRow = Array.isArray(filas) ? filas[0] : null;
        accion = 'actualizado';
      } else {
        const { sql, replacements } = construirInsertDetalleConteoSql({
          schemaDetail,
          codConteo,
          codProducto,
          codUbicacion,
          codInventario,
          stockSistema,
          stockFisico,
          diferencia,
          observaciones
        });

        const [filas] = await sequelize.query(sql, {
          replacements,
          transaction: t
        });

        detalleRow = Array.isArray(filas) ? filas[0] : null;
      }

      await t.commit();
      transaccionConfirmada = true;

      return {
        conteo,
        detalle: detalleRow,
        resumen: {
          accion,
          cod_conteo: codConteo,
          cod_inventario: codInventario,
          cod_producto: codProducto,
          cod_ubicacion: codUbicacion,
          stock_sistema: stockSistema,
          stock_fisico: stockFisico,
          diferencia
        }
      };
    } catch (error) {
      if (!transaccionConfirmada) {
        await t.rollback();
      }
      throw error;
    }
  }

  // // Cierra conteo: aplica ajustes, actualiza inventario y marca estado final en una sola transaccion
  async cerrarConteo(codConteo, payload, options = {}) {
    const schemaConteos = await this.obtenerSchemaConteosCompatible();
    const { header: schemaHeader, detail: schemaDetail } = schemaConteos;
    const schemaMovimiento = await inventarioMovimientosSchemaService.obtenerSchemaMovimiento();
    const codUsuario = options?.usuario?.cod_usuario ? Number(options.usuario.cod_usuario) : null;
    const observacionesCierre = payload?.observaciones_cierre ? String(payload.observaciones_cierre).trim() : '';

    const t = await sequelize.transaction();
    let transaccionConfirmada = false;

    try {
      // // Bloqueamos conteo objetivo para evitar doble cierre concurrente
      const conteo = await this.obtenerConteoPorId({
        schemaHeader,
        codConteo,
        transaction: t,
        forUpdate: true
      });
      if (!conteo) {
        throw Object.assign(new Error('Conteo no encontrado'), { status: 404 });
      }
      if (esConteoCerrado({ conteo, schemaHeader })) {
        throw Object.assign(new Error('El conteo ya se encuentra cerrado'), { status: 409 });
      }

      // // Bloqueamos todo el detalle del conteo para cierre atomico y consistente
      const detalles = await sequelize.query(construirSelectDetallesConteoSql({
        schemaDetail,
        forUpdate: true
      }), {
        replacements: { codConteo },
        type: sequelize.QueryTypes.SELECT,
        transaction: t
      });
      if (!Array.isArray(detalles) || detalles.length === 0) {
        throw Object.assign(new Error('No se puede cerrar un conteo sin detalles'), { status: 409 });
      }

      // // Detectamos soporte de stock_reservado para consultas de inventario por id
      let usaStockReservado = true;
      try {
        await sequelize.query(obtenerSelectInventarioPorId({
          usarStockReservado: true,
          forUpdate: false
        }), {
          replacements: { codInventario: -1 },
          type: sequelize.QueryTypes.SELECT,
          transaction: t
        });
      } catch (error) {
        if (esErrorColumnaNoExiste(error, 'stock_reservado')) {
          usaStockReservado = false;
        } else if (error?.status) {
          throw error;
        } else if (!String(error?.message || '').toLowerCase().includes('does not exist')) {
          // // Cualquier error distinto a columna faltante debe propagarse
          throw error;
        }
      }

      const movimientos = [];
      let ajustesPositivos = 0;
      let ajustesNegativos = 0;
      let ajustesSinCambio = 0;

      // // Recorremos detalle y aplicamos ajustes definitivos contra stock actual en BD
      for (const detalle of detalles) {
        const codProducto = Number(detalle[schemaDetail.codProducto]);
        const codUbicacion = Number(detalle[schemaDetail.codUbicacion]);
        const stockFisico = Number(detalle[schemaDetail.stockFisico]);
        if (!Number.isFinite(stockFisico) || stockFisico < 0) {
          throw Object.assign(new Error('Detalle con stock_fisico invalido en conteo'), { status: 400 });
        }

        // // Resolucion de inventario por cod_inventario (si existe en detalle) o por producto+ubicacion
        let inventario = null;
        const codInventarioDetalle = schemaDetail.codInventario ? Number(detalle[schemaDetail.codInventario]) : null;
        if (codInventarioDetalle) {
          inventario = await this.obtenerInventarioPorId({
            codInventario: codInventarioDetalle,
            usaStockReservado,
            transaction: t,
            forUpdate: true
          });
        }
        if (!inventario) {
          const inventarioLookup = await this.obtenerInventarioPorProductoUbicacion({
            codProducto,
            codUbicacion,
            transaction: t,
            forUpdate: true
          });
          inventario = inventarioLookup.inventario;
        }
        if (!inventario) {
          throw Object.assign(
            new Error(`Inventario no encontrado para producto ${codProducto} en ubicacion ${codUbicacion}`),
            { status: 404 }
          );
        }

        const codInventario = Number(inventario.cod_inventario);
        const stockSistemaActual = Number(inventario.stock || 0);
        const diferenciaFinal = stockFisico - stockSistemaActual;

        // // Cuando no hay diferencia final, solo contamos como sin cambio y continuamos
        if (diferenciaFinal === 0) {
          ajustesSinCambio += 1;
        } else {
          const stockResultado = stockSistemaActual + diferenciaFinal;
          if (stockResultado < 0) {
            throw Object.assign(
              new Error(`Ajuste invalido en inventario ${codInventario}: stock resultante negativo`),
              { status: 409 }
            );
          }

          // // Actualizamos stock al conteo fisico final dentro de la misma transaccion
          const [filasInventarioActualizado] = await sequelize.query(obtenerUpdateInventarioAStockFisico(), {
            replacements: {
              codInventario,
              stockFisico
            },
            transaction: t
          });
          const inventarioActualizado = Array.isArray(filasInventarioActualizado)
            ? filasInventarioActualizado[0]
            : null;
          if (!inventarioActualizado) {
            throw Object.assign(
              new Error(`No fue posible actualizar inventario ${codInventario} durante cierre de conteo`),
              { status: 409 }
            );
          }

          const tipoAjuste = diferenciaFinal > 0 ? 'AJUSTE+' : 'AJUSTE-';
          const cantidadMovimiento = Math.abs(diferenciaFinal);

          // // Movimiento AJUSTE trazable al conteo fisico cerrado
          const movimiento = await this.insertarMovimientoAjuste({
            schemaMovimiento,
            codInventario,
            codProducto,
            codUbicacion,
            codUsuario,
            cantidad: cantidadMovimiento,
            tipoAjuste,
            codConteo,
            observaciones: observacionesCierre || null,
            transaction: t
          });

          movimientos.push({
            cod_movimiento: schemaMovimiento.pk ? (movimiento?.[schemaMovimiento.pk] ?? null) : null,
            cod_inventario: codInventario,
            cod_producto: codProducto,
            cod_ubicacion: codUbicacion,
            tipo_ajuste: tipoAjuste,
            cantidad: cantidadMovimiento,
            stock_sistema_antes: stockSistemaActual,
            stock_fisico,
            stock_resultante: stockResultado
          });

          if (diferenciaFinal > 0) ajustesPositivos += 1;
          if (diferenciaFinal < 0) ajustesNegativos += 1;
        }

        // // Si existen columnas de stock_sistema/diferencia las actualizamos al cierre definitivo
        if (schemaDetail.pk && (schemaDetail.stockSistema || schemaDetail.diferencia)) {
          const pkDetalle = detalle[schemaDetail.pk];
          const { sql, replacements } = construirUpdateDetalleConteoSql({
            schemaDetail,
            pkDetalle,
            codInventario,
            stockSistema: stockSistemaActual,
            stockFisico,
            diferencia: diferenciaFinal,
            observaciones: schemaDetail.observaciones ? detalle[schemaDetail.observaciones] : null
          });

          await sequelize.query(sql, {
            replacements,
            transaction: t
          });
        }
      }

      // // Cambiamos estado de encabezado a cerrado dentro de la misma transaccion del cierre
      if (!schemaHeader.estado && !schemaHeader.fechaCierre) {
        throw Object.assign(
          new Error('El encabezado de conteo no tiene columna de estado ni fecha_cierre para marcar cierre'),
          { status: 500 }
        );
      }

      const sqlCerrar = construirUpdateCerrarConteoSql({ schemaHeader });
      const [filasCierre] = await sequelize.query(sqlCerrar, {
        replacements: {
          codConteo,
          codUsuarioCierre: codUsuario,
          observacionesCierre: observacionesCierre || null,
          anexoCierre: observacionesCierre ? ` | CIERRE: ${observacionesCierre}` : ' | CIERRE'
        },
        transaction: t
      });
      const conteoCerrado = Array.isArray(filasCierre) ? filasCierre[0] : null;
      if (!conteoCerrado) {
        throw Object.assign(new Error('No fue posible marcar el conteo como cerrado'), { status: 409 });
      }

      await t.commit();
      transaccionConfirmada = true;

      return {
        conteo: conteoCerrado,
        movimientos,
        resumen: {
          cod_conteo: codConteo,
          total_detalles: detalles.length,
          ajustes_positivos: ajustesPositivos,
          ajustes_negativos: ajustesNegativos,
          detalles_sin_cambio: ajustesSinCambio,
          total_movimientos_generados: movimientos.length
        }
      };
    } catch (error) {
      if (!transaccionConfirmada) {
        await t.rollback();
      }
      throw error;
    }
  }
}

export default new InventarioConteosService();
