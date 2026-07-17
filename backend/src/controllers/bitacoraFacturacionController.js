import * as XLSX from 'xlsx';
import bitacoraService from '../services/bitacoraFacturacionService.js';
import { formatearFechaHoraLocal } from '../utils/fechaLocal.js';

const EVENTO_LABELS = {
  FACTURA_CREADA: 'Factura Creada',
  FACTURA_ANULADA: 'Factura Anulada',
  FACTURA_ELIMINADA: 'Factura Eliminada',
  EXCEPCION_STOCK: 'Excepción Stock',
  COTIZACION_CONVERTIDA: 'Cotización Convertida',
  PAGO_REGISTRADO: 'Pago Registrado',
  PAGO_ANULADO: 'Pago Anulado',
  NOTA_CREDITO_CREADA: 'Nota de Crédito Creada',
  CLIENTE_ACTUALIZADO: 'Cliente Actualizado',
  PRODUCTO_ACTUALIZADO: 'Producto Actualizado',
  PRODUCTO_ESTADO_MASIVO: 'Cambio Masivo de Productos',
  LOGIN_EXITOSO: 'Login Exitoso',
  LOGIN_FALLIDO: 'Login Fallido',
  LOGIN_BLOQUEADO: 'Login Bloqueado',
};

const formatearValorDetalle = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '';
  if (Array.isArray(valor)) {
    return valor
      .map((item, index) => {
        if (item && typeof item === 'object') {
          const partes = Object.entries(item)
            .map(([clave, contenido]) => `${clave}: ${formatearValorDetalle(contenido)}`)
            .filter(Boolean);
          return `${index + 1}. ${partes.join(', ')}`;
        }
        return `${index + 1}. ${String(item)}`;
      })
      .join(' | ');
  }
  if (typeof valor === 'object') {
    return Object.entries(valor)
      .map(([clave, contenido]) => `${clave}: ${formatearValorDetalle(contenido)}`)
      .filter(Boolean)
      .join(' | ');
  }
  return String(valor);
};

const formatearDetalle = (detalle) => formatearValorDetalle(detalle);

export const listar = async (req, res) => {
  try {
    const resultado = await bitacoraService.listar(req.query);
    res.json({ ok: true, ...resultado });
  } catch (error) {
    console.error('❌ ERROR bitácora listar:', error.message);
    res.status(500).json({ ok: false, mensaje: error.message });
  }
};

export const tiposEvento = async (req, res) => {
  try {
    const tipos = await bitacoraService.tiposEvento();
    res.json({ ok: true, datos: tipos });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
};

export const tiposEntidad = async (req, res) => {
  try {
    const tipos = await bitacoraService.tiposEntidad();
    res.json({ ok: true, datos: tipos });
  } catch (error) {
    res.status(500).json({ ok: false, mensaje: error.message });
  }
};

export const eliminarEvento = async (req, res) => {
  try {
    const resultado = await bitacoraService.eliminar(req.params.id);
    res.json({ ok: true, ...resultado });
  } catch (error) {
    res.status(error.statusCode || 500).json({ ok: false, mensaje: error.message });
  }
};

export const exportarExcel = async (req, res) => {
  try {
    const registros = await bitacoraService.exportar(req.query);

    const encabezados = ['Código', 'Evento', 'Módulo', 'Factura', 'Usuario', 'Fecha', 'Detalle'];
    const filas = registros.map((registro) => ([
      registro.cod_bitacora,
      EVENTO_LABELS[registro.evento] || registro.evento,
      registro.entidad || 'FACTURA',
      registro.cod_factura ? `FAC-${String(registro.cod_factura).padStart(6, '0')}` : '—',
      registro.nombre_usuario || 'Sistema',
      formatearFechaHoraLocal(registro.fecha),
      formatearDetalle(registro.detalle) || 'Sin detalle'
    ]));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([encabezados, ...filas]);

    worksheet['!cols'] = [
      { wch: 10 },
      { wch: 24 },
      { wch: 18 },
      { wch: 16 },
      { wch: 18 },
      { wch: 24 },
      { wch: 90 }
    ];
    worksheet['!autofilter'] = { ref: `A1:G${filas.length + 1}` };

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Auditoria');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    const fechaArchivo = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="auditoria_facturacion_${fechaArchivo}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    console.error('❌ ERROR exportar Excel:', error.message);
    res.status(500).json({ ok: false, mensaje: error.message });
  }
};
