import React, { forwardRef } from 'react';

// =====================================================
// HU-FAC-06: Comprobante de Factura (Impresión / PDF)
// Plantilla profesional con: empresa, cliente, detalle,
// totales, número de factura, fecha/hora, métodos de pago,
// saldo pendiente.
// =====================================================

const formatMoney = (v) => {
  const n = parseFloat(v) || 0;
  return 'L ' + n.toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const metodosPago = { 1: 'Efectivo', 2: 'Tarjeta', 3: 'Transferencia' };

const ComprobanteFactura = forwardRef(({ factura }, ref) => {
  if (!factura) return null;

  const fechaEmision = factura.creado_en
    ? new Date(factura.creado_en)
    : new Date();

  const estadoPagoTexto = {
    PAGADA: 'PAGADA',
    PARCIAL: 'PAGO PARCIAL',
    PENDIENTE: 'PENDIENTE DE PAGO'
  };

  return (
    <div ref={ref} className="comprobante-factura">
      <style>{`
        .comprobante-factura {
          width: 210mm;
          min-height: auto;
          padding: 15mm 18mm;
          font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
          font-size: 11px;
          color: #1a1a1a;
          background: #fff;
          line-height: 1.5;
        }

        /* ---- Encabezado empresa ---- */
        .comp-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 3px solid #b91c1c;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .comp-empresa {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .comp-empresa-logo {
          width: 60px;
          height: 60px;
          object-fit: contain;
        }
        .comp-empresa-info h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 800;
          color: #b91c1c;
          letter-spacing: 1px;
        }
        .comp-empresa-info p {
          margin: 0;
          font-size: 10px;
          color: #525252;
        }

        /* ---- Número de factura ---- */
        .comp-factura-num {
          text-align: right;
        }
        .comp-factura-num h2 {
          margin: 0;
          font-size: 22px;
          font-weight: 800;
          color: #1a1a1a;
        }
        .comp-factura-num p {
          margin: 2px 0 0 0;
          font-size: 10px;
          color: #525252;
        }

        /* ---- Info cliente y factura ---- */
        .comp-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 16px;
        }
        .comp-info-box {
          background: #f9f9f9;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          padding: 10px 12px;
        }
        .comp-info-box h4 {
          margin: 0 0 6px 0;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          color: #b91c1c;
          letter-spacing: 0.5px;
        }
        .comp-info-box p {
          margin: 2px 0;
          font-size: 11px;
        }
        .comp-info-box strong {
          display: inline-block;
          min-width: 65px;
        }

        /* ---- Estado pago badge ---- */
        .comp-estado-pago {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }
        .comp-estado-pagada { background: #dcfce7; color: #166534; }
        .comp-estado-parcial { background: #fef9c3; color: #854d0e; }
        .comp-estado-pendiente { background: #fee2e2; color: #991b1b; }

        /* ---- Tabla detalle ---- */
        .comp-tabla {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
          font-size: 10.5px;
        }
        .comp-tabla thead th {
          background: #1a1a1a;
          color: #fff;
          padding: 6px 8px;
          text-align: left;
          font-weight: 600;
          font-size: 9.5px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .comp-tabla thead th:first-child { border-radius: 4px 0 0 0; }
        .comp-tabla thead th:last-child { border-radius: 0 4px 0 0; }
        .comp-tabla tbody td {
          padding: 5px 8px;
          border-bottom: 1px solid #e5e5e5;
        }
        .comp-tabla tbody tr:nth-child(even) {
          background: #fafafa;
        }
        .comp-tabla .text-right { text-align: right; }
        .comp-tabla .text-center { text-align: center; }

        /* ---- Totales ---- */
        .comp-totales-container {
          display: flex;
          justify-content: flex-end;
        }
        .comp-totales {
          width: 280px;
          border: 1px solid #e5e5e5;
          border-radius: 6px;
          overflow: hidden;
        }
        .comp-totales-row {
          display: flex;
          justify-content: space-between;
          padding: 5px 12px;
          font-size: 11px;
          border-bottom: 1px solid #f0f0f0;
        }
        .comp-totales-row.descuento {
          color: #dc2626;
        }
        .comp-totales-row.isv {
          color: #525252;
        }
        .comp-totales-row.total {
          background: #1a1a1a;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          padding: 8px 12px;
          border-bottom: none;
        }
        .comp-totales-row.pagado {
          background: #f0fdf4;
          color: #166534;
          font-weight: 600;
        }
        .comp-totales-row.saldo {
          background: #fee2e2;
          color: #991b1b;
          font-weight: 600;
          border-bottom: none;
        }
        .comp-totales-row.saldo-cero {
          background: #f0fdf4;
          color: #166534;
          font-weight: 600;
          border-bottom: none;
        }

        /* ---- Sección pagos ---- */
        .comp-pagos {
          margin-top: 14px;
          margin-bottom: 14px;
        }
        .comp-pagos h4 {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: #b91c1c;
          margin: 0 0 6px 0;
          letter-spacing: 0.3px;
        }
        .comp-pagos-tabla {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }
        .comp-pagos-tabla th {
          background: #f5f5f5;
          padding: 4px 8px;
          text-align: left;
          font-weight: 600;
          font-size: 9px;
          text-transform: uppercase;
          border-bottom: 2px solid #e5e5e5;
        }
        .comp-pagos-tabla td {
          padding: 3px 8px;
          border-bottom: 1px solid #f0f0f0;
        }

        /* ---- Footer ---- */
        .comp-footer {
          margin-top: 20px;
          padding-top: 12px;
          border-top: 2px solid #e5e5e5;
          text-align: center;
          font-size: 9.5px;
          color: #737373;
        }
        .comp-footer p {
          margin: 2px 0;
        }
        .comp-footer-thanks {
          font-size: 12px;
          font-weight: 700;
          color: #b91c1c;
          margin-top: 8px !important;
        }

        /* ---- Anulada watermark ---- */
        .comp-anulada-watermark {
          position: relative;
        }
        .comp-anulada-watermark::after {
          content: 'ANULADA';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-30deg);
          font-size: 80px;
          font-weight: 900;
          color: rgba(220, 38, 38, 0.12);
          pointer-events: none;
          z-index: 1;
        }

        /* ---- @media print ---- */
        @media print {
          .comprobante-factura {
            padding: 10mm 12mm;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .comp-tabla thead th {
            background: #1a1a1a !important;
            color: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .comp-totales-row.total {
            background: #1a1a1a !important;
            color: #fff !important;
          }
        }
      `}</style>

      <div className={!factura.estado ? 'comp-anulada-watermark' : ''} style={{ position: 'relative' }}>

        {/* ========== ENCABEZADO ========== */}
        <div className="comp-header">
          <div className="comp-empresa">
            <img src="/src/assets/img/logo1.jpeg" alt="J&R" className="comp-empresa-logo" 
              onError={(e) => { e.target.style.display = 'none'; }} />
            <div className="comp-empresa-info">
              <h1>J &amp; R REPUESTOS</h1>
              <p>Venta de repuestos automotrices</p>
              <p>Tegucigalpa, Honduras</p>
              <p>Tel: (504) 0000-0000 | info@jyrrepuestos.com</p>
            </div>
          </div>
          <div className="comp-factura-num">
            <h2>FAC-{String(factura.cod_factura).padStart(4, '0')}</h2>
            <p>COMPROBANTE DE FACTURA</p>
            {!factura.estado && (
              <span style={{ color: '#dc2626', fontWeight: 700, fontSize: 14 }}>ANULADA</span>
            )}
          </div>
        </div>

        {/* ========== INFO CLIENTE / FACTURA ========== */}
        <div className="comp-info-grid">
          <div className="comp-info-box">
            <h4>Datos del Cliente</h4>
            <p><strong>Nombre:</strong> {factura.cliente?.nombre} {factura.cliente?.apellido || ''}</p>
            {factura.cliente?.dni && <p><strong>DNI:</strong> {factura.cliente.dni}</p>}
            {factura.cliente?.empresa && <p><strong>Empresa:</strong> {factura.cliente.empresa}</p>}
          </div>
          <div className="comp-info-box">
            <h4>Datos de la Factura</h4>
            <p><strong>No. Factura:</strong> FAC-{String(factura.cod_factura).padStart(4, '0')}</p>
            <p><strong>Fecha:</strong> {fechaEmision.toLocaleDateString('es-HN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p><strong>Hora:</strong> {fechaEmision.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
            <p><strong>Cajero:</strong> {factura.usuario?.nombre_usuario || factura.usuario?.nombre || '-'}</p>
            <p>
              <strong>Estado:</strong>{' '}
              <span className={`comp-estado-pago comp-estado-${factura.estado_pago === 'PAGADA' ? 'pagada' : factura.estado_pago === 'PARCIAL' ? 'parcial' : 'pendiente'}`}>
                {estadoPagoTexto[factura.estado_pago] || 'PENDIENTE'}
              </span>
            </p>
          </div>
        </div>

        {/* ========== DETALLE PRODUCTOS ========== */}
        <table className="comp-tabla">
          <thead>
            <tr>
              <th style={{ width: '5%' }}>#</th>
              <th style={{ width: '35%' }}>Producto</th>
              <th className="text-center" style={{ width: '8%' }}>Cant.</th>
              <th className="text-right" style={{ width: '13%' }}>P. Unitario</th>
              <th className="text-right" style={{ width: '13%' }}>Descuento</th>
              <th className="text-right" style={{ width: '13%' }}>ISV</th>
              <th className="text-right" style={{ width: '13%' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {factura.detalles?.map((d, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{d.producto?.nombre_producto || `Producto #${d.cod_producto}`}</td>
                <td className="text-center">{d.cantidad}</td>
                <td className="text-right">{formatMoney(d.precio_unitario)}</td>
                <td className="text-right">
                  {parseFloat(d.monto_descuento || 0) > 0
                    ? <>-{formatMoney(d.monto_descuento)} <span style={{ fontSize: '9px', color: '#737373' }}>({d.tipo_descuento === 'PORCENTAJE' ? `${d.descuento}%` : `L ${d.descuento}`})</span></>
                    : '-'
                  }
                </td>
                <td className="text-right">{formatMoney(d.isv)}</td>
                <td className="text-right" style={{ fontWeight: 600 }}>{formatMoney(d.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ========== TOTALES ========== */}
        <div className="comp-totales-container">
          <div className="comp-totales">
            <div className="comp-totales-row">
              <span>Subtotal:</span>
              <span>{formatMoney(factura.subtotal)}</span>
            </div>
            {parseFloat(factura.descuento || 0) > 0 && (
              <div className="comp-totales-row descuento">
                <span>Descuento total:</span>
                <span>-{formatMoney(factura.descuento)}</span>
              </div>
            )}
            {parseFloat(factura.monto_descuento_global || 0) > 0 && (
              <div className="comp-totales-row descuento">
                <span>
                  Desc. global ({factura.tipo_descuento_global === 'PORCENTAJE' ? `${factura.descuento_global}%` : `L ${factura.descuento_global}`}):
                </span>
                <span>-{formatMoney(factura.monto_descuento_global)}</span>
              </div>
            )}
            <div className="comp-totales-row isv">
              <span>ISV:</span>
              <span>{formatMoney(factura.isv)}</span>
            </div>
            <div className="comp-totales-row total">
              <span>TOTAL:</span>
              <span>{formatMoney(factura.total)}</span>
            </div>

            {/* Pagado y saldo */}
            {factura.estado && (
              <>
                <div className="comp-totales-row pagado">
                  <span>Total pagado:</span>
                  <span>{formatMoney(factura.total_pagado || 0)}</span>
                </div>
                <div className={`comp-totales-row ${parseFloat(factura.saldo || factura.total) > 0 ? 'saldo' : 'saldo-cero'}`}>
                  <span>Saldo pendiente:</span>
                  <span>{formatMoney(factura.saldo ?? factura.total)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ========== MÉTODOS DE PAGO REGISTRADOS ========== */}
        {factura.pagos && factura.pagos.filter(p => p.estado).length > 0 && (
          <div className="comp-pagos">
            <h4>Pagos Registrados</h4>
            <table className="comp-pagos-tabla">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha</th>
                  <th>Método</th>
                  <th>Referencia</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {factura.pagos.filter(p => p.estado).map((p, i) => (
                  <tr key={p.cod_pago}>
                    <td>{i + 1}</td>
                    <td>{new Date(p.fecha_pago).toLocaleString('es-HN', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td>{metodosPago[p.metodo_pago] || p.metodo_pago}</td>
                    <td>{p.ref_pago || '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatMoney(p.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ========== FOOTER ========== */}
        <div className="comp-footer">
          <p>Comprobante generado el {new Date().toLocaleString('es-HN', { dateStyle: 'long', timeStyle: 'short' })}</p>
          {factura.descuento_aplicado_por && (
            <p>Descuento autorizado por usuario #{factura.descuento_aplicado_por}</p>
          )}
          <p>Este documento es un comprobante de la transacción realizada.</p>
          <p className="comp-footer-thanks">¡Gracias por su compra!</p>
        </div>

      </div>
    </div>
  );
});

ComprobanteFactura.displayName = 'ComprobanteFactura';

export default ComprobanteFactura;
