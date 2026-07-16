import { sendOk } from '../utils/response.js';
import logger from '../config/logger.js';
import inventarioEntradasService from '../services/inventarioEntradasService.js';
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

// // GET /api/inventario/entradas/reporte/pdf
// // Exporta entradas de inventario usando la misma fuente del historial operativo
export const exportarEntradasPdf = async (req, res, next) => {
  try {
    const resultado = await inventarioMovimientosService.listarMovimientos({
      ...req.query,
      tipo: 'ENTRADA',
      excluir_ref_tipo: 'ANULACION_SALIDA,ANULACION_BAJA',
      page: 1,
      pagina: 1,
      limit: 100,
      limite: 100
    });

    const filas = Array.isArray(resultado?.data) ? resultado.data : [];
    const pdf = await generarReportePdf({
      titulo: 'Reporte de entradas',
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
    res.setHeader('Content-Disposition', 'attachment; filename="reporte-entradas.pdf"');
    return res.send(pdf);
  } catch (error) {
    next(error);
  }
};

// // POST /api/inventario/entradas
// // Registra entradas de inventario (recepcion/compra) con trazabilidad en kardex (HU4)
export const registrarEntrada = async (req, res, next) => {
  try {
    // // Ejecutamos flujo transaccional del service usando el usuario autenticado para auditoria
    const data = await inventarioEntradasService.registrarEntrada(req.body, {
      usuario: req.usuario
    });

    // // Log estructurado minimo para trazabilidad operativa de entradas
    logger.info('inventario.entradas.registrada', {
      modulo: 'inventario',
      accion: 'registrar_entrada',
      usuario: req.usuario ? {
        cod_usuario: req.usuario.cod_usuario ?? null,
        nombre_usuario: req.usuario.nombre_usuario ?? null,
        rol: req.usuario.rol ?? null
      } : null,
      referencia_documento: req.body?.referencia_documento ?? null,
      cod_producto: req.body?.cod_producto ?? null,
      cod_ubicacion: req.body?.cod_ubicacion ?? null,
      cantidad: req.body?.cantidad ?? null,
      cod_inventario: data?.inventario?.cod_inventario ?? data?.resumen?.cod_inventario ?? null
    });

    // // 201 Created por tratarse de creacion de movimiento de kardex (y registro de entrada)
    return sendOk(res, {
      status: 201,
      message: 'Entrada de inventario registrada correctamente',
      data
    });
  } catch (error) {
    // // Error controlado/inesperado pasa al middleware global
    next(error);
  }
};

// // PATCH /api/inventario/entradas/:id/anular
// // Revierte una entrada con salida compensatoria y trazabilidad de auditoria
export const anularEntrada = async (req, res, next) => {
  try {
    const data = await inventarioEntradasService.anularEntrada(req.params.id, req.body, {
      usuario: req.usuario
    });

    logger.info('inventario.entradas.anulada', {
      modulo: 'inventario',
      accion: 'anular_entrada',
      usuario: req.usuario ? {
        cod_usuario: req.usuario.cod_usuario ?? null,
        nombre_usuario: req.usuario.nombre_usuario ?? null,
        rol: req.usuario.rol ?? null
      } : null,
      cod_movimiento_entrada: Number(req.params?.id || 0),
      motivo: req.body?.motivo ?? 'ANULACION_ENTRADA',
      referencia: req.body?.referencia ?? null,
      cod_inventario: data?.resumen?.cod_inventario ?? null,
      stock_antes: data?.resumen?.stock_antes ?? null,
      stock_despues: data?.resumen?.stock_despues ?? null
    });

    return sendOk(res, {
      status: 200,
      message: 'Entrada anulada correctamente',
      data
    });
  } catch (error) {
    next(error);
  }
};
