import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { FiSave, FiX, FiUserPlus, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { clienteService } from '../../services/serviceIndex.js';

const REGEX_TEXTO_CON_PUNTO = /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ.\s]+$/;
const REGEX_CORREO_PERMITIDO = /^[A-Za-z0-9@.]+$/;

const sanitizarTextoConPunto = (valor = '', maximo = 100) => (
  valor
    .replace(/[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ.\s]/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, maximo)
);

const sanitizarCorreo = (valor = '', maximo = 30) => (
  valor
    .replace(/[^A-Za-z0-9@.]/g, '')
    .toLowerCase()
    .slice(0, maximo)
);

// ==========================================
// MODAL CREACIÓN/EDICIÓN RÁPIDA DE CLIENTE
// Usado desde NuevaFactura (HU-FAC-11)
// ==========================================
const ModalClienteRapido = ({ visible, onCerrar, onClienteCreado, clienteEditar = null }) => {
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    rtn: '',
    empresa: '',
    telefono: '',
    correo: '',
    direccion: ''
  });
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [duplicado, setDuplicado] = useState(null);
  const [verificando, setVerificando] = useState(false);
  const nombreRef = useRef(null);
  const dniTimerRef = useRef(null);
  const correoTimerRef = useRef(null);

  // Prellenar si es edición
  useEffect(() => {
    if (clienteEditar) {
      setForm({
        nombre: clienteEditar.nombre || '',
        apellido: clienteEditar.apellido || '',
        dni: clienteEditar.dni || '',
        rtn: clienteEditar.rtn || '',
        empresa: clienteEditar.empresa || '',
        telefono: clienteEditar.telefono || '',
        correo: clienteEditar.correo || '',
        direccion: clienteEditar.direccion || ''
      });
    } else {
      setForm({ nombre: '', apellido: '', dni: '', rtn: '', empresa: '', telefono: '', correo: '', direccion: '' });
    }
    setErrores({});
    setDuplicado(null);
  }, [clienteEditar, visible]);

  // Focus al abrir
  useEffect(() => {
    if (visible && nombreRef.current) {
      setTimeout(() => nombreRef.current?.focus(), 200);
    }
  }, [visible]);

  // Verificar duplicado por DNI (debounce)
  useEffect(() => {
    if (dniTimerRef.current) clearTimeout(dniTimerRef.current);
    if (!form.dni || form.dni.length < 5) { setDuplicado(null); return; }
    // No verificar si estamos editando el mismo cliente
    dniTimerRef.current = setTimeout(async () => {
      try {
        setVerificando(true);
        const resp = await clienteService.verificarDuplicado({ dni: form.dni });
        const data = resp.data?.datos || resp.data;
        if (data?.duplicado && (!clienteEditar || data.cliente.cod_cliente !== clienteEditar.cod_cliente)) {
          setDuplicado({ campo: 'DNI', cliente: data.cliente });
        } else {
          setDuplicado(null);
        }
      } catch { /* silenciar */ }
      finally { setVerificando(false); }
    }, 500);
    return () => clearTimeout(dniTimerRef.current);
  }, [form.dni, clienteEditar]);

  // Verificar duplicado por correo (debounce)
  useEffect(() => {
    if (correoTimerRef.current) clearTimeout(correoTimerRef.current);
    if (!form.correo || form.correo.length < 5) return;
    correoTimerRef.current = setTimeout(async () => {
      try {
        const resp = await clienteService.verificarDuplicado({ correo: form.correo });
        const data = resp.data?.datos || resp.data;
        if (data?.duplicado && (!clienteEditar || data.cliente.cod_cliente !== clienteEditar.cod_cliente)) {
          setDuplicado({ campo: 'Correo', cliente: data.cliente });
        }
      } catch { /* silenciar */ }
    }, 500);
    return () => clearTimeout(correoTimerRef.current);
  }, [form.correo, clienteEditar]);

  const handleChange = (campo, valor) => {
    setForm(prev => ({ ...prev, [campo]: valor }));
    if (errores[campo]) setErrores(prev => ({ ...prev, [campo]: null }));
  };

  // Validaciones mínimas
  const validar = () => {
    const errs = {};
    if (!form.nombre.trim()) errs.nombre = 'El nombre es requerido';
    if (form.nombre.trim().length > 10) errs.nombre = 'El nombre no puede exceder 10 caracteres';
    if (!form.apellido.trim()) errs.apellido = 'El apellido es requerido';
    if (form.apellido.trim().length > 10) errs.apellido = 'El apellido no puede exceder 10 caracteres';
    if (!form.dni.trim()) errs.dni = 'El DNI es requerido';
    if (form.dni.trim() && !/^\d{13}$/.test(form.dni.trim())) errs.dni = 'El DNI debe tener exactamente 13 dígitos numéricos';
    if (form.rtn && !/^\d{14}$/.test(form.rtn.trim())) errs.rtn = 'El RTN debe tener exactamente 14 dígitos numéricos';
    if (!form.empresa.trim()) errs.empresa = 'La empresa es requerida';
    if (form.empresa.trim().length > 15) errs.empresa = 'La empresa no puede exceder 15 caracteres';
    if (form.empresa.trim() && !REGEX_TEXTO_CON_PUNTO.test(form.empresa.trim())) errs.empresa = 'La empresa solo permite letras, números, espacios y punto';
    if (!form.telefono.trim()) errs.telefono = 'El teléfono es requerido';
    if (form.telefono.trim() && !/^\d{8}$/.test(form.telefono.trim())) errs.telefono = 'El teléfono debe tener exactamente 8 dígitos numéricos';
    if (!form.correo.trim()) errs.correo = 'El correo es requerido';
    if (form.correo.trim() && !REGEX_CORREO_PERMITIDO.test(form.correo.trim())) errs.correo = 'El correo solo permite letras, números, @ y punto';
    if (form.correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim())) errs.correo = 'El correo no tiene un formato válido';
    if (!form.direccion.trim()) errs.direccion = 'La dirección es requerida';
    if (form.direccion.trim().length > 60) errs.direccion = 'La dirección no puede exceder 60 caracteres';
    if (form.direccion.trim() && !REGEX_TEXTO_CON_PUNTO.test(form.direccion.trim())) errs.direccion = 'La dirección solo permite letras, números, espacios y punto';
    setErrores(errs);
    return Object.keys(errs).length === 0;
  };

  // Guardar cliente
  const guardar = async () => {
    if (!validar()) return;
    setGuardando(true);
    try {
      const payload = {
        ...form,
        rtn: form.rtn.trim() || null
      };

      let resp;
      if (clienteEditar) {
        resp = await clienteService.actualizar(clienteEditar.cod_cliente, payload);
      } else {
        resp = await clienteService.crear(payload);
      }
      const cliente = resp.data?.datos || resp.data;
      toast.success(clienteEditar ? 'Cliente actualizado' : 'Cliente creado y seleccionado');
      onClienteCreado(cliente);
      onCerrar();
    } catch (err) {
      const msg = err.response?.data?.mensaje || err.message;
      if (msg.includes('DNI ya está registrado')) {
        setErrores(prev => ({ ...prev, dni: 'Este DNI ya está registrado' }));
      } else if (msg.includes('correo ya está registrado')) {
        setErrores(prev => ({ ...prev, correo: 'Este correo ya está registrado' }));
      } else {
        toast.error(msg);
      }
    } finally {
      setGuardando(false);
    }
  };

  // Seleccionar el duplicado existente
  const seleccionarDuplicado = () => {
    if (duplicado?.cliente) {
      onClienteCreado(duplicado.cliente);
      onCerrar();
      toast.info('Cliente existente seleccionado');
    }
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,.55)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: '#1e1e2f', color: '#e0e0e0', borderRadius: 12,
        width: '95%', maxWidth: 580, padding: '24px 28px',
        boxShadow: '0 8px 32px rgba(0,0,0,.45)', border: '1px solid #444',
        maxHeight: '90vh', overflowY: 'auto'
      }}>
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0" style={{ color: '#4fc3f7' }}>
            <FiUserPlus className="me-2" />
            {clienteEditar ? 'Editar Cliente' : 'Nuevo Cliente Rápido'}
          </h5>
          <button className="btn btn-sm btn-outline-secondary" onClick={onCerrar} style={{ border: 'none' }}>
            <FiX size={20} />
          </button>
        </div>

        {/* Aviso de duplicado */}
        {duplicado && (
          <div className="alert alert-warning py-2 px-3 d-flex align-items-center justify-content-between" style={{ fontSize: '0.82rem', background: '#3a2a00', border: '1px solid #ff9800', color: '#ffcc80' }}>
            <div>
              <FiAlertCircle className="me-1" />
              Ya existe un cliente con este {duplicado.campo}: <strong>{duplicado.cliente.nombre} {duplicado.cliente.apellido || ''}</strong>
              {duplicado.cliente.empresa && ` (${duplicado.cliente.empresa})`}
            </div>
            <button className="btn btn-warning btn-sm ms-2" style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
              onClick={seleccionarDuplicado}>
              Usar existente
            </button>
          </div>
        )}

        {/* Formulario */}
        <div className="row g-2">
          <div className="col-6">
            <label className="form-label small mb-1">Nombre <span className="text-danger">*</span></label>
            <input ref={nombreRef} type="text" className={`form-control form-control-sm ${errores.nombre ? 'is-invalid' : ''}`}
              value={form.nombre} onChange={e => handleChange('nombre', e.target.value.slice(0, 10))}
              maxLength={10}
              placeholder="Nombre del cliente"
              style={{ background: '#2a2a3d', color: '#e0e0e0', border: '1px solid #555' }}
              onKeyDown={e => e.key === 'Enter' && guardar()} />
            {errores.nombre && <div className="invalid-feedback">{errores.nombre}</div>}
          </div>
          <div className="col-6">
            <label className="form-label small mb-1">Apellido <span className="text-danger">*</span></label>
            <input type="text" className={`form-control form-control-sm ${errores.apellido ? 'is-invalid' : ''}`}
              value={form.apellido} onChange={e => handleChange('apellido', e.target.value.slice(0, 10))}
              maxLength={10}
              placeholder="Apellido"
              style={{ background: '#2a2a3d', color: '#e0e0e0', border: '1px solid #555' }} />
            {errores.apellido && <div className="invalid-feedback">{errores.apellido}</div>}
          </div>
          <div className="col-4">
            <label className="form-label small mb-1">
              DNI / Identidad <span className="text-danger">*</span>
              {verificando && <span className="spinner-border spinner-border-sm ms-1" style={{ width: 12, height: 12 }} />}
            </label>
            <input type="text" className={`form-control form-control-sm ${errores.dni ? 'is-invalid' : ''}`}
              value={form.dni}
              onChange={e => handleChange('dni', e.target.value.replace(/\D/g, '').slice(0, 13))}
              maxLength={13}
              placeholder="13 dígitos"
              style={{ background: '#2a2a3d', color: '#e0e0e0', border: '1px solid #555' }} />
            {errores.dni && <div className="invalid-feedback">{errores.dni}</div>}
          </div>
          <div className="col-4">
            <label className="form-label small mb-1">RTN (opcional)</label>
            <input type="text" className={`form-control form-control-sm ${errores.rtn ? 'is-invalid' : ''}`}
              value={form.rtn} onChange={e => handleChange('rtn', e.target.value.replace(/\D/g, '').slice(0, 14))}
              maxLength={14}
              placeholder="14 dígitos"
              style={{ background: '#2a2a3d', color: '#e0e0e0', border: '1px solid #555' }} />
            {errores.rtn && <div className="invalid-feedback">{errores.rtn}</div>}
          </div>
          <div className="col-4">
            <label className="form-label small mb-1">Empresa <span className="text-danger">*</span></label>
            <input type="text" className={`form-control form-control-sm ${errores.empresa ? 'is-invalid' : ''}`}
              value={form.empresa} onChange={e => handleChange('empresa', sanitizarTextoConPunto(e.target.value, 15))}
              maxLength={15}
              placeholder="Empresa"
              style={{ background: '#2a2a3d', color: '#e0e0e0', border: '1px solid #555' }} />
            {errores.empresa && <div className="invalid-feedback">{errores.empresa}</div>}
          </div>
          <div className="col-6">
            <label className="form-label small mb-1">Teléfono <span className="text-danger">*</span></label>
            <input type="text" className={`form-control form-control-sm ${errores.telefono ? 'is-invalid' : ''}`}
              value={form.telefono}
              onChange={e => handleChange('telefono', e.target.value.replace(/\D/g, '').slice(0, 8))}
              maxLength={8}
              placeholder="8 dígitos"
              style={{ background: '#2a2a3d', color: '#e0e0e0', border: '1px solid #555' }} />
            {errores.telefono && <div className="invalid-feedback">{errores.telefono}</div>}
          </div>
          <div className="col-6">
            <label className="form-label small mb-1">Correo <span className="text-danger">*</span></label>
            <input type="email" className={`form-control form-control-sm ${errores.correo ? 'is-invalid' : ''}`}
              value={form.correo} onChange={e => handleChange('correo', sanitizarCorreo(e.target.value, 30))}
              maxLength={30}
              placeholder="correo@ejemplo.com"
              style={{ background: '#2a2a3d', color: '#e0e0e0', border: '1px solid #555' }} />
            {errores.correo && <div className="invalid-feedback">{errores.correo}</div>}
          </div>
          <div className="col-12">
            <label className="form-label small mb-1">Dirección <span className="text-danger">*</span></label>
            <input type="text" className={`form-control form-control-sm ${errores.direccion ? 'is-invalid' : ''}`}
              value={form.direccion} onChange={e => handleChange('direccion', sanitizarTextoConPunto(e.target.value, 60))}
              maxLength={60}
              placeholder="Dirección"
              style={{ background: '#2a2a3d', color: '#e0e0e0', border: '1px solid #555' }} />
            {errores.direccion && <div className="invalid-feedback">{errores.direccion}</div>}
          </div>
        </div>

        {/* Acciones */}
        <div className="d-flex justify-content-end gap-2 mt-3">
          <button className="btn btn-outline-secondary btn-sm" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="btn btn-info btn-sm fw-bold" onClick={guardar} disabled={guardando}>
            {guardando ? <span className="spinner-border spinner-border-sm me-1" /> : <FiSave className="me-1" />}
            {clienteEditar ? 'Actualizar' : 'Guardar y Seleccionar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalClienteRapido;
