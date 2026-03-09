import React, { useState, useEffect } from 'react';
import { empresaConfigService } from '../../services/serviceIndex.js';
import { toast } from 'react-toastify';
import { FiSave, FiRefreshCw } from 'react-icons/fi';

const ConfigEmpresa = () => {
  const [form, setForm] = useState({
    nombre: '', rtn: '', direccion: '', telefono: '',
    correo: '', cai: '', rango_autorizado: '',
    fecha_limite_emision: '', propietaria: '', garantia: ''
  });
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

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
        });
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
