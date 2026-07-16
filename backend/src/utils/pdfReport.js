import PDFDocument from 'pdfkit';

const BRAND = {
  red: '#E11D2E',
  dark: '#1F2937',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  border: '#D1D5DB',
  white: '#FFFFFF'
};

const limpiarTexto = (valor = '') => String(valor ?? '')
  .replace(/\s+/g, ' ')
  .trim();

const formatearValor = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '-';
  return limpiarTexto(valor);
};

const crearBufferPdf = (doc) => new Promise((resolve, reject) => {
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);
});

const dibujarFooter = (doc) => {
  const range = doc.bufferedPageRange();

  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const pageNumber = i + 1;
    const totalPages = range.count;
    const bottom = doc.page.height - 28;

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(BRAND.gray)
      .text(`Pagina ${pageNumber} de ${totalPages}`, doc.page.margins.left, bottom, {
        align: 'center',
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right
      });
  }
};

const dibujarEncabezado = (doc, { titulo, subtitulo, filtros = [], metricas = [] }) => {
  const { left, right } = doc.page.margins;
  const pageWidth = doc.page.width - left - right;
  const top = doc.y;

  doc
    .roundedRect(left, top, 72, 42, 8)
    .fill(BRAND.red);

  doc
    .font('Helvetica-Bold')
    .fontSize(20)
    .fillColor(BRAND.white)
    .text('J&R', left, top + 10, { width: 72, align: 'center' });

  doc
    .font('Helvetica-Bold')
    .fontSize(18)
    .fillColor(BRAND.dark)
    .text(titulo, left + 88, top + 2, { width: pageWidth - 88 });

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(BRAND.gray)
    .text(subtitulo || `Generado: ${new Date().toLocaleString('es-HN')}`, left + 88, top + 25, {
      width: pageWidth - 88
    });

  doc.y = top + 58;

  const resumen = [...metricas, ...filtros].filter(Boolean);
  if (resumen.length > 0) {
    const chipHeight = 20;
    let x = left;
    let y = doc.y;

    resumen.forEach((item) => {
      const label = limpiarTexto(item.label || '');
      const value = formatearValor(item.value);
      const text = label ? `${label}: ${value}` : value;
      const width = Math.min(Math.max(doc.widthOfString(text) + 22, 110), pageWidth);

      if (x + width > left + pageWidth) {
        x = left;
        y += chipHeight + 6;
      }

      doc
        .roundedRect(x, y, width, chipHeight, 10)
        .fill(BRAND.lightGray);

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor(BRAND.dark)
        .text(text, x + 11, y + 6, { width: width - 22, height: chipHeight });

      x += width + 6;
    });

    doc.y = y + chipHeight + 18;
  }
};

const dibujarTablaHeader = (doc, columnas, x, y) => {
  const tableWidth = columnas.reduce((sum, col) => sum + col.width, 0);

  doc
    .rect(x, y, tableWidth, 24)
    .fill(BRAND.dark);

  let cursorX = x;
  columnas.forEach((col) => {
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(BRAND.white)
      .text(col.header, cursorX + 6, y + 7, {
        width: col.width - 12,
        align: col.align || 'left'
      });
    cursorX += col.width;
  });

  return y + 24;
};

const calcularAltoFila = (doc, columnas, fila) => {
  doc.font('Helvetica').fontSize(8);

  const heights = columnas.map((col) => {
    const rawValue = typeof col.value === 'function' ? col.value(fila) : fila[col.key];
    const value = col.format ? col.format(rawValue, fila) : rawValue;
    return doc.heightOfString(formatearValor(value), {
      width: col.width - 12,
      align: col.align || 'left'
    });
  });

  return Math.max(24, Math.ceil(Math.max(...heights)) + 12);
};

const dibujarFila = (doc, columnas, fila, x, y, rowHeight, index) => {
  const tableWidth = columnas.reduce((sum, col) => sum + col.width, 0);
  const fill = index % 2 === 0 ? BRAND.white : '#FAFAFA';

  doc
    .rect(x, y, tableWidth, rowHeight)
    .fill(fill);

  doc
    .strokeColor(BRAND.border)
    .lineWidth(0.4)
    .rect(x, y, tableWidth, rowHeight)
    .stroke();

  let cursorX = x;
  columnas.forEach((col) => {
    const rawValue = typeof col.value === 'function' ? col.value(fila) : fila[col.key];
    const value = col.format ? col.format(rawValue, fila) : rawValue;

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(BRAND.dark)
      .text(formatearValor(value), cursorX + 6, y + 6, {
        width: col.width - 12,
        align: col.align || 'left',
        height: rowHeight - 10
      });

    cursorX += col.width;
  });
};

export const generarReportePdf = async ({
  titulo,
  subtitulo,
  filtros = [],
  metricas = [],
  columnas = [],
  filas = [],
  layout = 'landscape'
}) => {
  const doc = new PDFDocument({
    size: 'LETTER',
    layout,
    margin: 36,
    bufferPages: true,
    info: {
      Title: titulo,
      Author: 'J&R Repuestos'
    }
  });

  const bufferPromise = crearBufferPdf(doc);
  const tableX = doc.page.margins.left;
  const bottomLimit = () => doc.page.height - doc.page.margins.bottom - 30;

  dibujarEncabezado(doc, { titulo, subtitulo, filtros, metricas });

  let y = dibujarTablaHeader(doc, columnas, tableX, doc.y);

  if (filas.length === 0) {
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(BRAND.gray)
      .text('No hay datos para mostrar.', tableX, y + 18);
  } else {
    filas.forEach((fila, index) => {
      const rowHeight = calcularAltoFila(doc, columnas, fila);

      if (y + rowHeight > bottomLimit()) {
        doc.addPage();
        dibujarEncabezado(doc, { titulo, subtitulo, filtros, metricas });
        y = dibujarTablaHeader(doc, columnas, tableX, doc.y);
      }

      dibujarFila(doc, columnas, fila, tableX, y, rowHeight, index);
      y += rowHeight;
    });
  }

  dibujarFooter(doc);
  doc.end();

  return bufferPromise;
};
