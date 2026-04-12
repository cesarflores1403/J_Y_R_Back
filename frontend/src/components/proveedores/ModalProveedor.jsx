import React,{useState} from 'react';
import {proveedorService} from '../../services/serviceIndex.js';
import {toast} from 'react-toastify';

// Valores iniciales
const camposIniciales={nombre_proveedor:'',telefono:'',correo:'',pais:'',es_internacional:false,validado:''};

// Filtros de entrada
const soloLetras=v=>v.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g,'');
const soloTelefono=v=>{const l=v.replace(/[^0-9-]/g,''),d=l.replace(/-/g,'');return d.length>8?v.slice(0,-1):l};
const soloCorreo=v=>v.replace(/[^A-Za-z0-9@.]/g,'');

// Regex correo válido
const regexCorreo=/^[a-zA-Z0-9]+([._]?[a-zA-Z0-9]+)*@[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)+$/;

const ModalProveedor=({editando,proveedorInicial,onClose,onGuardado})=>{
  const [form,setForm]=useState(proveedorInicial||camposIniciales);
  const [errores,setErrores]=useState({});
  const [guardando,setGuardando]=useState(false);

  // Limpia errores
  const limpiarError=c=>errores[c]&&setErrores({...errores,[c]:''});

  // Validación general
  const validar=()=>{
    const e={};

    if(!form.nombre_proveedor.trim()) e.nombre_proveedor='El nombre es obligatorio';
    else if(form.nombre_proveedor.trim().length<2) e.nombre_proveedor='Mínimo 2 caracteres';

    if(form.telefono.trim()){
      const d=form.telefono.replace(/-/g,'');
      if(!/^\d+$/.test(d)) e.telefono='Solo números y guion';
      else if(d.length!==8) e.telefono='Debe tener 8 dígitos';
    }

    // Validación básica (sin duplicar el mensaje del navegador)
    if(form.correo.trim()&&!regexCorreo.test(form.correo.trim())){
      e.correo='Introduce una dirección de correo válida';
    }

    if(form.pais.trim()&&!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]+$/.test(form.pais.trim())){
      e.pais='Solo letras';
    }

    setErrores(e);
    return Object.keys(e).length===0;
  };

  // Guardar proveedor
  const guardar=async e=>{
    e.preventDefault();
    if(!validar()) return;

    setGuardando(true);
    try{
      const res=editando
        ?await proveedorService.actualizar(editando,form)
        :await proveedorService.crear(form);

      toast.success(editando?'Proveedor actualizado':'Proveedor creado');
      onGuardado?.(res?.data?.datos||null);
      onClose();
    }catch(err){
      toast.error(err.response?.data?.mensaje||'Error al guardar');
    }finally{
      setGuardando(false);
    }
  };

  return(
    <div className="modal show d-block" style={{backgroundColor:'rgba(0,0,0,0.5)',zIndex:1070}}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">

          {/* Header */}
          <div className="modal-header">
            <h5 className="modal-title">{editando?'Editar Proveedor':'Nuevo Proveedor'}</h5>
            <button className="btn-close" onClick={onClose}/>
          </div>

          {/* Formulario */}
          <form onSubmit={guardar}>
            <div className="modal-body">
              <div className="row g-3">

                {/* Nombre */}
                <div className="col-md-6">
                  <label className="form-label">Nombre *</label>
                  <input
                    type="text"
                    className={`form-control ${errores.nombre_proveedor?'is-invalid':''}`}
                    value={form.nombre_proveedor}
                    maxLength={100}
                    onChange={e=>{
                      setForm({...form,nombre_proveedor:soloLetras(e.target.value)});
                      limpiarError('nombre_proveedor');
                    }}
                  />
                  {errores.nombre_proveedor&&<div className="invalid-feedback">{errores.nombre_proveedor}</div>}
                </div>

                {/* Teléfono */}
                <div className="col-md-6">
                  <label className="form-label">Teléfono</label>
                  <input
                    type="text"
                    className={`form-control ${errores.telefono?'is-invalid':''}`}
                    value={form.telefono}
                    maxLength={9}
                    onChange={e=>{
                      setForm({...form,telefono:soloTelefono(e.target.value)});
                      limpiarError('telefono');
                    }}
                  />
                  {errores.telefono&&<div className="invalid-feedback">{errores.telefono}</div>}
                </div>

                {/* Correo con mensaje tipo navegador */}
                <div className="col-md-6">
                  <label className="form-label">Correo</label>
                  <input
                    type="email"
                    className={`form-control ${errores.correo?'is-invalid':''}`}
                    value={form.correo}
                    maxLength={100}
                    onChange={e=>{
                      setForm({...form,correo:soloCorreo(e.target.value).toLowerCase()});
                      limpiarError('correo');
                      e.target.setCustomValidity('');
                    }}
                    onInvalid={e=>{
                      const correo=e.target.value.trim();

                      if(!correo.includes('@')){
                        e.target.setCustomValidity(`Incluye un signo "@" en la dirección de correo electrónico. La dirección "${correo}" no incluye el signo "@".`);
                      }else if(!correo.includes('.')){
                        e.target.setCustomValidity('Incluye un punto (.) en la dirección de correo electrónico.');
                      }else{
                        e.target.setCustomValidity('Introduce una dirección de correo electrónico válida.');
                      }
                    }}
                    onInput={e=>e.target.setCustomValidity('')}
                    required
                  />
                  {errores.correo&&<div className="invalid-feedback">{errores.correo}</div>}
                </div>

                {/* País */}
                <div className="col-md-3">
                  <label className="form-label">País</label>
                  <input
                    type="text"
                    className={`form-control ${errores.pais?'is-invalid':''}`}
                    value={form.pais}
                    maxLength={50}
                    onChange={e=>{
                      setForm({...form,pais:soloLetras(e.target.value)});
                      limpiarError('pais');
                    }}
                  />
                  {errores.pais&&<div className="invalid-feedback">{errores.pais}</div>}
                </div>

                {/* Internacional */}
                <div className="col-md-3 d-flex align-items-end">
                  <div className="form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="esInternacionalModal"
                      checked={form.es_internacional}
                      onChange={e=>setForm({...form,es_internacional:e.target.checked})}
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
                    onChange={e=>setForm({...form,validado:e.target.value})}
                  />
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn jyr-btn-primary" disabled={guardando}>
                {guardando&&<span className="spinner-border spinner-border-sm me-2"/>}
                {editando?'Actualizar':'Crear'}
              </button>
            </div>

          </form>

        </div>
      </div>
    </div>
  );
};

export default ModalProveedor;
