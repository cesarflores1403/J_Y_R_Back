import bitacoraService from '../services/bitacoraFacturacionService.js';

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

export const exportarCSV = async (req, res) => {
  try {
    const registros = await bitacoraService.exportar(req.query);

    // Generar CSV
    const headers = ['Código', 'Evento', 'Entidad', 'Factura', 'Usuario', 'Detalle', 'IP', 'Fecha'];
    const rows = registros.map(r => [
      r.cod_bitacora,
      r.evento,
      r.entidad,
      r.cod_factura || '',
      r.nombre_usuario || '',
      r.detalle ? JSON.stringify(r.detalle).replace(/"/g, '""') : '',
      r.ip || '',
      r.fecha ? new Date(r.fecha).toLocaleString('es-HN') : ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // BOM para Excel
    const bom = '\uFEFF';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="bitacora_facturacion_${Date.now()}.csv"`);
    res.send(bom + csvContent);
  } catch (error) {
    console.error('❌ ERROR exportar CSV:', error.message);
    res.status(500).json({ ok: false, mensaje: error.message });
  }
};
