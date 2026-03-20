import React, { useState, useEffect, useRef } from 'react';
import { empresaConfigService } from '../../services/serviceIndex.js';
import { toast } from 'react-toastify';
import { FiSave, FiRefreshCw, FiUpload } from 'react-icons/fi';
import { confirmDialog } from '../../utils/notifications.js';
import { resolveApiBase } from '../../utils/runtimeApi.js';

const ConfigEmpresa = () => {
  const API_BASE = resolveApiBase();
  const inputLogoRef = useRef(null);
  const [form, setForm] = useState({
    nombre: '', rtn: '', direccion: '', telefono: '',
    correo: '', cai: '', rango_autorizado: '',
    fecha_limite_emision: '', propietaria: '', garantia: '', logo_factura_url: ''
  });
  const [correlativos, setCorrelativos] = useState({
    siguiente_factura: '',
    siguiente_cotizacion: '',
    min_factura: 1,
    min_cotizacion: 1
  });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardandoCorrelativos, setGuardandoCorrelativos] = useState(false);
  const [subiendoLogo, setSubiendoLogo] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const { data } = await empresaConfigService.obtener();
      if (data.ok && data.datos) {
        setForm({
          nombre: data.datos.nombre || '',
          rtn: data.datos.rtn || '',
          direccion: data.datos.direccion || '',
          telefono: data.datos.telefono || '',
          correo: data.datos.correo || '',
          cai: data.datos.cai || '',
          rango_autorizado: data.datos.rango_autorizado || '',
          fecha_limite_emision: data.datos.fecha_limite_emision || '',
          propietaria: data.datos.propietaria || '',
          garantia: data.datos.garantia || '',
          logo_factura_url: data.datos.logo_factura_url || '',
        });
      }

      try {
        const respCorrelativos = await empresaConfigService.obtenerCorrelativos();
        const datosCorrelativos = respCorrelativos?.data?.datos;
        if (respCorrelativos?.data?.ok && datosCorrelativos) {
          setCorrelativos({
            siguiente_factura: `${datosCorrelativos.siguiente_factura ?? ''}`,
            siguiente_cotizacion: `${datosCorrelativos.siguiente_cotizacion ?? ''}`,
            min_factura: parseInt(datosCorrelativos.min_factura || 1, 10),
            min_cotizacion: parseInt(datosCorrelativos.min_cotizacion || 1, 10)
          });
        }
      } catch {
        // Si falla correlativos, no bloquea la carga del formulario principal
      }
    } catch {
      toast.error('Error al cargar configuración de empresa');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCorrelativoChange = (e) => {
    const { name, value } = e.target;
    const limpio = value.replace(/\D/g, '');
    setCorrelativos(prev => ({ ...prev, [name]: limpio }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) return toast.warn('El nombre de la empresa es obligatorio');
    if (!form.rtn.trim()) return toast.warn('El RTN es obligatorio');
    if (!form.direccion.trim()) return toast.warn('La dirección es obligatoria');
    if (!form.telefono.trim()) return toast.warn('El teléfono es obligatorio');
    if (!form.correo.trim()) return toast.warn('El correo es obligatorio');

    setGuardando(true);
    try {
      const { data } = await empresaConfigService.actualizar(form);
      if (data.ok) {
        toast.success('Datos de empresa actualizados correctamente');
      } else {
        toast.error(data.mensaje || 'Error al guardar');
      }
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'Error al guardar configuración';
      toast.error(msg);
    } finally {
      setGuardando(false);
    }
  };

  const guardarCorrelativos = async () => {
    const siguienteFactura = parseInt(correlativos.siguiente_factura || '0', 10);
    const siguienteCotizacion = parseInt(correlativos.siguiente_cotizacion || '0', 10);

    if (!siguienteFactura || siguienteFactura < 1) {
      return toast.warn('Ingresa un siguiente numero de factura valido');
    }
    if (!siguienteCotizacion || siguienteCotizacion < 1) {
      return toast.warn('Ingresa un siguiente numero de cotizacion valido');
    }

    setGuardandoCorrelativos(true);
    try {
      const { data } = await empresaConfigService.actualizarCorrelativos({
        siguiente_factura: siguienteFactura,
        siguiente_cotizacion: siguienteCotizacion
      });

      if (data.ok && data.datos) {
        setCorrelativos({
          siguiente_factura: `${data.datos.siguiente_factura ?? ''}`,
          siguiente_cotizacion: `${data.datos.siguiente_cotizacion ?? ''}`,
          min_factura: parseInt(data.datos.min_factura || 1, 10),
          min_cotizacion: parseInt(data.datos.min_cotizacion || 1, 10)
        });
      }

      toast.success(data?.mensaje || 'Correlativos actualizados correctamente');
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'No se pudieron actualizar los correlativos';
      toast.error(msg);
    } finally {
      setGuardandoCorrelativos(false);
    }
  };

  const seleccionarArchivoLogo = () => {
    inputLogoRef.current?.click();
  };

  const subirLogoFactura = async (e) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;

    const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!tiposPermitidos.includes(archivo.type)) {
      return toast.warn('Formato no valido. Usa jpg, png, gif, webp o svg');
    }

    const formData = new FormData();
    formData.append('logo', archivo);

    setSubiendoLogo(true);
    try {
      const { data } = await empresaConfigService.subirLogoFactura(formData);
      if (data.ok && data.datos) {
        setForm(prev => ({
          ...prev,
          logo_factura_url: data.datos.logo_factura_url || ''
        }));
        toast.success(data?.mensaje || 'Logo actualizado correctamente');
      }
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'No se pudo subir el logo';
      toast.error(msg);
    } finally {
      setSubiendoLogo(false);
    }
  };

  const quitarLogoFactura = async () => {
    if (!form.logo_factura_url) return;
    const ok = await confirmDialog({
      variant: 'restore',
      title: 'Restablecer logo',
      text: 'Se restablecera el logo predeterminado de factura. ¿Deseas continuar?',
      confirmText: 'Sí, restablecer'
    });
    if (!ok) return;

    setSubiendoLogo(true);
    try {
      const { data } = await empresaConfigService.quitarLogoFactura();
      if (data.ok) {
        setForm(prev => ({ ...prev, logo_factura_url: '' }));
        toast.success(data?.mensaje || 'Logo restablecido al predeterminado');
      }
    } catch (err) {
      const msg = err.response?.data?.mensaje || 'No se pudo quitar el logo';
      toast.error(msg);
    } finally {
      setSubiendoLogo(false);
    }
  };

  if (cargando) {
    return (
      <div className="jyr-card">
        <div className="jyr-card-body text-center py-5">
          <div className="spinner-border text-primary" />
          <p className="mt-2">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="jyr-card">
      <div className="jyr-card-body">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="mb-0">⚙️ Configuración de Datos de Factura</h4>
          <button className="btn jyr-btn-secondary btn-sm" onClick={cargar} title="Recargar">
            <FiRefreshCw /> Recargar
          </button>
        </div>

        <p className="text-muted mb-4">
          Estos datos aparecen en todas las facturas generadas. Solo el <strong>Super Administrador</strong> puede modificarlos.
        </p>

        <form onSubmit={guardar}>
          <div className="row g-3">

            {/* Nombre de empresa */}
            <div className="col-md-6">
              <label className="form-label">Nombre de la Empresa *</label>
              <input type="text" className="form-control" name="nombre"
                value={form.nombre} onChange={handleChange} maxLength={100} required />
              <small className="text-muted">{form.nombre.length}/100</small>
            </div>

            {/* RTN */}
            <div className="col-md-6">
              <label className="form-label">RTN *</label>
              <input type="text" className="form-control" name="rtn"
                value={form.rtn} onChange={handleChange} maxLength={20} required />
              <small className="text-muted">{form.rtn.length}/20</small>
            </div>

            {/* Propietaria */}
            <div className="col-md-6">
              <label className="form-label">Propietaria</label>
              <input type="text" className="form-control" name="propietaria"
                value={form.propietaria} onChange={handleChange} maxLength={100} />
            </div>

            {/* Correo */}
            <div className="col-md-6">
              <label className="form-label">Correo Electrónico *</label>
              <input type="email" className="form-control" name="correo"
                value={form.correo} onChange={handleChange} maxLength={100} required />
            </div>

            {/* Teléfono */}
            <div className="col-md-6">
              <label className="form-label">Teléfono *</label>
              <input type="text" className="form-control" name="telefono"
                value={form.telefono} onChange={handleChange} maxLength={50} required />
            </div>

            {/* Dirección */}
            <div className="col-12">
              <label className="form-label">Dirección *</label>
              <textarea className="form-control" name="direccion" rows={2}
                value={form.direccion} onChange={handleChange} maxLength={300} required />
              <small className="text-muted">{form.direccion.length}/300</small>
            </div>

            {/* Logo de factura */}
            <div className="col-12">
              <label className="form-label">Logo de Factura (URL o ruta /uploads/...)</label>
              <div className="d-flex flex-wrap gap-2 mb-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={seleccionarArchivoLogo}
                  disabled={subiendoLogo}
                >
                  <FiUpload className="me-1" />
                  {subiendoLogo ? 'Subiendo logo...' : 'Subir Logo'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-danger"
                  onClick={quitarLogoFactura}
                  disabled={subiendoLogo || !form.logo_factura_url}
                >
                  Quitar Logo
                </button>
                <input
                  ref={inputLogoRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                  onChange={subirLogoFactura}
                  style={{ display: 'none' }}
                />
              </div>
              <input
                type="text"
                className="form-control"
                name="logo_factura_url"
                placeholder="Ej: /uploads/mi-logo.png o https://misitio.com/logo.png"
                value={form.logo_factura_url}
                onChange={handleChange}
                maxLength={300}
              />
              <small className="text-muted">Si lo dejas vacio se usa el logo predeterminado.</small>
            </div>

            {form.logo_factura_url && (
              <div className="col-12">
                <div className="border rounded p-2 d-inline-flex align-items-center gap-2" style={{ background: '#fff' }}>
                  <span className="text-muted small">Vista previa:</span>
                  <img
                    src={form.logo_factura_url.startsWith('http') ? form.logo_factura_url : `${API_BASE}${form.logo_factura_url}`}
                    alt="Logo factura"
                    style={{ height: 56, objectFit: 'contain' }}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              </div>
            )}

            <hr className="my-2" />
            <h5 className="mb-0">Datos Fiscales (SAR)</h5>

            {/* CAI */}
            <div className="col-md-6">
              <label className="form-label">CAI</label>
              <input type="text" className="form-control" name="cai"
                value={form.cai} onChange={handleChange} maxLength={50} />
            </div>

            {/* Rango Autorizado */}
            <div className="col-md-6">
              <label className="form-label">Rango Autorizado</label>
              <input type="text" className="form-control" name="rango_autorizado"
                value={form.rango_autorizado} onChange={handleChange} maxLength={100} />
            </div>

            {/* Fecha Límite Emisión */}
            <div className="col-md-6">
              <label className="form-label">Fecha Límite de Emisión</label>
              <input type="date" className="form-control" name="fecha_limite_emision"
                value={form.fecha_limite_emision} onChange={handleChange} />
            </div>

            {/* Garantía */}
            <div className="col-md-6">
              <label className="form-label">Texto de Garantía</label>
              <input type="text" className="form-control" name="garantia"
                value={form.garantia} onChange={handleChange} maxLength={200} />
            </div>

            <hr className="my-2" />
            <h5 className="mb-0">Correlativos de Documentos</h5>
            <p className="text-muted small mb-2">
              Apartado separado para ajustar numeracion. Solo el <strong>Super Administrador</strong> puede editar estos valores.
            </p>

            <div className="col-md-6">
              <label className="form-label">Siguiente N° de Factura</label>
              <input
                type="text"
                className="form-control"
                name="siguiente_factura"
                value={correlativos.siguiente_factura}
                onChange={handleCorrelativoChange}
                inputMode="numeric"
              />
              <small className="text-muted">Minimo permitido: {correlativos.min_factura}</small>
            </div>

            <div className="col-md-6">
              <label className="form-label">Siguiente N° de Cotización</label>
              <input
                type="text"
                className="form-control"
                name="siguiente_cotizacion"
                value={correlativos.siguiente_cotizacion}
                onChange={handleCorrelativoChange}
                inputMode="numeric"
              />
              <small className="text-muted">Minimo permitido: {correlativos.min_cotizacion}</small>
            </div>

            <div className="col-12 d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={guardarCorrelativos}
                disabled={guardandoCorrelativos}
              >
                <FiSave className="me-1" />
                {guardandoCorrelativos ? 'Guardando numeracion...' : 'Guardar Numeración'}
              </button>
            </div>

          </div>

          <div className="mt-4 d-flex gap-2">
            <button type="submit" className="btn jyr-btn-primary" disabled={guardando}>
              <FiSave className="me-1" />
              {guardando ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConfigEmpresa;
