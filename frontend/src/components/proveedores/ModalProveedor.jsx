import React, { useState } from 'react';
import { proveedorService } from '../../services/serviceIndex.js';
import { toast } from 'react-toastify';

const camposIniciales = {
  nombre_proveedor: '', telefono: '', correo: '',
  pais: '', es_internacional: false, validado: ''
};

// Solo letras, espacios y caracteres acentuados
const soloLetras = (valor) =>
  valor.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g, '');

// Solo números y guion, máximo 8 dígitos numéricos
const soloTelefono = (valor) => {
  const limpio = valor.replace(/[^0-9-]/g, '');
  // Contar solo los dígitos (sin guiones)
  const soloDigitos = limpio.replace(/-/g, '');
  if (soloDigitos.length > 8) return valor.slice(0, -1); // no aceptar más de 8 dígitos
  return limpio;
};

const ModalProveedor = ({ editando, proveedorInicial, onClose, onGuardado }) => {
  const [form, setForm]       = useState(proveedorInicial || camposIniciales);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);

  const validar = () => {
    const e = {};

    if (!form.nombre_proveedor.trim())
      e.nombre_proveedor = 'El nombre es obligatorio';
    else if (form.nombre_proveedor.trim().length < 2)
      e.nombre_proveedor = 'El nombre debe tener al menos 2 caracteres';

    if (form.telefono.trim()) {
      const digitos = form.telefono.replace(/-/g, '');
      if (!/^\d+$/.test(digitos))
        e.telefono = 'El teléfono solo permite números y guion (-)';
      else if (digitos.length !== 8)
        e.telefono = 'El teléfono debe tener exactamente 8 dígitos';
    }

    if (form.correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim()))
      e.correo = 'El correo no tiene un formato válido';

    if (form.pais.trim() && !/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/.test(form.pais.trim()))
      e.pais = 'El país solo permite letras';

    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!validar()) return;
    setGuardando(true);
    try {
      let resultado;
      if (editando) {
        resultado = await proveedorService.actualizar(editando, form);
        toast.success('Proveedor actualizado');
      } else {
        resultado = await proveedorService.crear(form);
        toast.success('Proveedor creado');
      }
      if (onGuardado) onGuardado(resultado?.data?.datos || null);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  const campo = (key, label, requerido = false) => ({
    label: requerido ? `${label} *` : label,
    className: `form-control ${errores[key] ? 'is-invalid' : ''}`,
    error: errores[key]
  });

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1070 }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{editando ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h5>
            <button className="btn-close" onClick={onClose} />
          </div>
          <form onSubmit={guardar}>
            <div className="modal-body">
              <div className="row g-3">

                {/* Nombre */}
                <div className="col-md-6">
                  <label className="form-label">{campo('nombre_proveedor', 'Nombre', true).label}</label>
                  <input
                    type="text"
                    className={campo('nombre_proveedor', '', true).className}
                    value={form.nombre_proveedor}
                    maxLength={100}
                    onChange={(e) => {
                      const v = soloLetras(e.target.value);
                      setForm({ ...form, nombre_proveedor: v });
                      if (errores.nombre_proveedor) setErrores({ ...errores, nombre_proveedor: '' });
                    }}
                    
                  />
                  {errores.nombre_proveedor && (
                    <div className="invalid-feedback">{errores.nombre_proveedor}</div>
                  )}
                </div>

                {/* Teléfono */}
                <div className="col-md-6">
                  <label className="form-label">Teléfono</label>
                  <input
                    type="text"
                    className={campo('telefono').className}
                    value={form.telefono}
                    onChange={(e) => {
                      const v = soloTelefono(e.target.value);
                      setForm({ ...form, telefono: v });
                      if (errores.telefono) setErrores({ ...errores, telefono: '' });
                    }}
                    placeholder="00000000 o 0000-0000"
                    maxLength={9}
                  />
                  {errores.telefono
                    ? <div className="invalid-feedback">{errores.telefono}</div>
                    : <small className="text-muted">8 dígitos, puede incluir guion (-)</small>
                  }
                </div>

                {/* Correo */}
                <div className="col-md-6">
                  <label className="form-label">Correo</label>
                  <input
                    type="email"
                    className={campo('correo').className}
                    value={form.correo}
                    maxLength={100}
                    onChange={(e) => {
                      setForm({ ...form, correo: e.target.value.toLowerCase() });
                      if (errores.correo) setErrores({ ...errores, correo: '' });
                    }}
                    
                  />
                  {errores.correo && (
                    <div className="invalid-feedback">{errores.correo}</div>
                  )}
                </div>

                {/* País */}
                <div className="col-md-3">
                  <label className="form-label">País</label>
                  <input
                    type="text"
                    className={campo('pais').className}
                    value={form.pais}
                    maxLength={50}
                    onChange={(e) => {
                      const v = soloLetras(e.target.value);
                      setForm({ ...form, pais: v });
                      if (errores.pais) setErrores({ ...errores, pais: '' });
                    }}
                    
                  />
                  {errores.pais && (
                    <div className="invalid-feedback">{errores.pais}</div>
                  )}
                </div>

                {/* Internacional */}
                <div className="col-md-3 d-flex align-items-end">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="esInternacionalModal"
                      checked={form.es_internacional}
                      onChange={(e) => setForm({ ...form, es_internacional: e.target.checked })}
                    />
                    <label className="form-check-label" htmlFor="esInternacionalModal">Internacional</label>
                  </div>
                </div>

                {/* Validado */}
                <div className="col-md-12">
                  <label className="form-label">Validado</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.validado}
                    maxLength={100}
                    onChange={(e) => setForm({ ...form, validado: e.target.value })}
                  />
                </div>

              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn jyr-btn-primary" disabled={guardando}>
                {guardando ? <span className="spinner-border spinner-border-sm me-2" /> : null}
                {editando ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ModalProveedor;