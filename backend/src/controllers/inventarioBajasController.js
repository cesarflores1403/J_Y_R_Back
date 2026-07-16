import { sendOk } from '../utils/response.js';
import logger from '../config/logger.js';
import inventarioBajasService from '../services/inventarioBajasService.js';
import inventarioMovimientosService from '../services/inventarioMovimientosService.js';
import { generarReportePdf } from '../utils/pdfReport.js';

const formatearFechaPdf = (valor) => {
  if (!valor) return '-';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return fecha.toLocaleString('es-HN');
};

const formatearUbicacionPdf = (valor = '') => {
  const texto = String(valor || '').trim();
  if (!texto) return '-';
  const partes = texto.split('-').map((parte) => parte.trim()).filter(Boolean);
  if (partes.length !== 4) return texto;
  const [pasillo, estanteria, nivel1, nivel2] = partes;
  return `P:${pasillo} E:${estanteria} N1:${nivel1} N2:${nivel2}`;
};

// // GET /api/inventario/bajas/reporte/pdf
// // Exporta bajas de inventario usando la misma fuente del historial operativo
export const exportarBajasPdf = async (req, res, next) => {
  try {
    const resultado = await inventarioMovimientosService.listarMovimientos({
      ...req.query,
      tipo: 'BAJA',
      page: 1,
      pagina: 1,
      limit: 100,
      limite: 100
    });

    const filas = Array.isArray(resultado?.data) ? resultado.data : [];
    const pdf = await generarReportePdf({
      titulo: 'Reporte de bajas',
      filtros: [
        { label: 'Producto', value: req.query?.cod_producto || 'Todos' },
        { label: 'Ubicacion', value: req.query?.cod_ubicacion || 'Todas' },
        { label: 'Estado', value: req.query?.estado || 'TODAS' },
        { label: 'Desde', value: req.query?.fecha_desde || 'Todos' },
        { label: 'Hasta', value: req.query?.fecha_hasta || 'Todos' }
      ],
      metricas: [
        { label: 'Total filtrado', value: resultado?.total || filas.length },
        { label: 'Registros exportados', value: filas.length }
      ],
      columnas: [
        { header: '#', key: 'numero', width: 28, align: 'center' },
        { header: 'Fecha', key: 'fecha', width: 100 },
        { header: 'Producto', key: 'producto', width: 132 },
        { header: 'Ubicacion', key: 'ubicacion', width: 116 },
        { header: 'Cantidad', key: 'cantidad', width: 60, align: 'right' },
        { header: 'Referencia', key: 'referencia', width: 132 },
        { header: 'Usuario', key: 'usuario', width: 76 },
        { header: 'Estado', key: 'estado', width: 76 }
      ],
      filas: filas.map((fila, index) => ({
        numero: index + 1,
        fecha: formatearFechaPdf(fila.fecha_movimiento),
        producto: `${fila.nombre_producto || '-'} (${fila.cod_producto ?? '-'})`,
        ubicacion: `${formatearUbicacionPdf(fila.ubicacion)} (${fila.cod_ubicacion ?? '-'})`,
        cantidad: Number(fila.cantidad || 0).toLocaleString('es-HN'),
        referencia: fila.referencia_documento || '-',
        usuario: fila.nombre_usuario || '-',
        estado: fila.anulado ? 'ANULADA' : 'ACTIVA'
      }))
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="reporte-bajas.pdf"');
    return res.send(pdf);
  } catch (error) {
    next(error);
  }
};

// // POST /api/inventario/bajas
// // Registra baja por dano/perdida, actualiza inventario y deja trazabilidad en kardex
export const registrarBaja = async (req, res, next) => {
  try {
    // // Ejecutamos flujo transaccional de bajas con usuario autenticado para auditoria
    const resultado = await inventarioBajasService.registrarBaja(req.body, {
      usuario: req.usuario
    });

    // // Contrato operativo para frontend interno y consumidores externos de inventario
    const data = {
      baja_id: resultado?.resumen?.cod_baja_inventario ?? null,
      movimiento_id: resultado?.movimiento?.cod_movimiento ?? null,
      producto: {
        cod_producto: resultado?.movimiento?.cod_producto ?? req.body?.cod_producto ?? null,
        nombre_producto: resultado?.movimiento?.nombre_producto ?? null
      },
      ubicacion: {
        cod_ubicacion: resultado?.movimiento?.cod_ubicacion ?? req.body?.cod_ubicacion ?? null,
        descripcion: resultado?.movimiento?.ubicacion ?? null
      },
      cantidad: resultado?.resumen?.cantidad_baja ?? req.body?.cantidad ?? null,
      motivo: req.body?.motivo ?? null,
      descripcion: req.body?.descripcion ?? null,
      referencia: req.body?.referencia ?? null,
      stock_actual: resultado?.inventario?.stock ?? null,
      stock_disponible: resultado?.inventario?.stock_disponible ?? null,
      tipo_movimiento_solicitado: resultado?.resumen?.tipo_movimiento_solicitado ?? 'BAJA',
      tipo_movimiento_aplicado: resultado?.resumen?.tipo_movimiento_aplicado ?? null,
      fallback_tipo_movimiento: resultado?.resumen?.fallback_tipo_movimiento ?? false,
      tabla_baja_inventario_existe: resultado?.resumen?.tabla_baja_inventario_existe ?? false,
      movimiento: resultado?.movimiento ?? null,
      inventario: resultado?.inventario ?? null,
      resumen: resultado?.resumen ?? null
    };

    // // Auditoria de la baja registrada con snapshot de stock y tipo de movimiento aplicado
    logger.info('inventario.bajas.registrada', {
      modulo: 'inventario',
      accion: 'registrar_baja',
      usuario: req.usuario ? {
        cod_usuario: req.usuario.cod_usuario ?? null,
        nombre_usuario: req.usuario.nombre_usuario ?? null,
        rol: req.usuario.rol ?? null
      } : null,
      cod_producto: req.body?.cod_producto ?? null,
      cod_ubicacion: req.body?.cod_ubicacion ?? null,
      cantidad: req.body?.cantidad ?? null,
      motivo: req.body?.motivo ?? null,
      referencia: req.body?.referencia ?? null,
      cod_baja_inventario: resultado?.resumen?.cod_baja_inventario ?? null,
      tipo_movimiento_aplicado: resultado?.resumen?.tipo_movimiento_aplicado ?? null,
      fallback_tipo_movimiento: resultado?.resumen?.fallback_tipo_movimiento ?? false,
      stock_antes: resultado?.resumen?.stock_antes ?? null,
      stock_despues: resultado?.resumen?.stock_despues ?? null
    });

    // // 201 Created por creacion de baja/movimiento y actualizacion consistente de inventario
    return sendOk(res, {
      status: 201,
      message: 'Baja de inventario registrada correctamente',
      data
    });
  } catch (error) {
    // // Manejo centralizado de errores controlados e inesperados
    next(error);
  }
};

// // PATCH /api/inventario/bajas/:id/anular
// // Revierte una baja con entrada compensatoria y trazabilidad de auditoria
export const anularBaja = async (req, res, next) => {
  try {
    const data = await inventarioBajasService.anularBaja(req.params.id, req.body, {
      usuario: req.usuario
    });

    logger.info('inventario.bajas.anulada', {
      modulo: 'inventario',
      accion: 'anular_baja',
      usuario: req.usuario ? {
        cod_usuario: req.usuario.cod_usuario ?? null,
        nombre_usuario: req.usuario.nombre_usuario ?? null,
        rol: req.usuario.rol ?? null
      } : null,
      cod_movimiento_baja: Number(req.params?.id || 0),
      motivo: req.body?.motivo ?? 'ANULACION_BAJA',
      referencia: req.body?.referencia ?? null,
      cod_inventario: data?.resumen?.cod_inventario ?? null,
      stock_antes: data?.resumen?.stock_antes ?? null,
      stock_despues: data?.resumen?.stock_despues ?? null
    });

    return sendOk(res, {
      status: 200,
      message: 'Baja anulada correctamente',
      data
    });
  } catch (error) {
    next(error);
  }
};
