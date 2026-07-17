import React,{useState,useEffect,useCallback,useRef,useMemo} from 'react';
import {comprasService,proveedorService} from '../../services/serviceIndex.js';
import {useProducto} from '../../hooks/useProducto.js';
import {useConfirm} from '../../contexts/ConfirmDialogContext.jsx';
import {toast} from 'react-toastify';
import {FiPlus,FiSearch,FiX,FiEye,FiShoppingCart,FiTrash2,FiCheck,FiEdit2,FiDownload} from 'react-icons/fi';
import {confirmDialog} from '../../utils/notifications.js';
import ModalProveedor from '../proveedores/ModalProveedor.jsx';
import ProductoForm from '../producto/ProductoForm.jsx';

// Formatos auxiliares
const fmtFecha=f=>f?new Date(f).toLocaleDateString('es-HN'):'-';
const fmtMoneda=(v,m='HNL')=>`${m} ${parseFloat(v||0).toLocaleString('es-HN',{minimumFractionDigits:2})}`;
const fmtOC=id=>`OC-${String(id).padStart(4,'0')}`;

const obtenerMensajeErrorBlob=async(err,fallback)=>{
  const data=err?.response?.data;

  if(data instanceof Blob){
    try{
      const texto=await data.text();
      const json=JSON.parse(texto);
      return json?.mensaje||json?.message||fallback;
    }catch{
      return fallback;
    }
  }

  return data?.mensaje||data?.message||fallback;
};

const BADGE_ESTADO={
  Pendiente:'bg-warning text-dark',
  Aprobada:'bg-primary',
  'En Tránsito':'bg-info text-dark',
  Recibida:'bg-success',
  Cancelada:'bg-danger'
};

// Lista desplegable reutilizable
const ListaDesplegable=({items,onSelect,renderItem})=>{
  if(!items||items.length===0) return null;
  return(
    <ul style={{position:'absolute',zIndex:1060,top:'100%',left:0,right:0,background:'#fff',border:'1px solid #dee2e6',borderRadius:6,boxShadow:'0 4px 16px rgba(0,0,0,0.12)',listStyle:'none',margin:0,padding:'4px 0',maxHeight:230,overflowY:'auto'}}>
      {items.map((item,i)=>(
        <li
          key={i}
          onMouseDown={e=>{e.preventDefault();onSelect(item);}}
          style={{padding:'8px 14px',cursor:'pointer',fontSize:14}}
          onMouseEnter={e=>e.currentTarget.style.background='#f0f4ff'}
          onMouseLeave={e=>e.currentTarget.style.background=''}
        >
          {renderItem(item)}
        </li>
      ))}
    </ul>
  );
};

// Buscador de proveedor
const BuscadorProveedor=({valor,proveedores=[],onSeleccionar})=>{
  const [texto,setTexto]=useState(valor?.nombre_proveedor||'');
  const [abierto,setAbierto]=useState(false);
  const ref=useRef(null);

  // Sincroniza el texto mostrado cuando cambia el proveedor seleccionado
  // (p. ej. al crear uno nuevo desde el modal, se refleja automáticamente)
  useEffect(()=>{
    setTexto(valor?.nombre_proveedor||'');
  },[valor?.cod_proveedor,valor?.nombre_proveedor]);

  useEffect(()=>{
    const fn=e=>{if(ref.current&&!ref.current.contains(e.target)) setAbierto(false);};
    document.addEventListener('mousedown',fn);
    return()=>document.removeEventListener('mousedown',fn);
  },[]);

  const filtrados=proveedores.filter(p=>texto.trim()&&p.nombre_proveedor.toLowerCase().includes(texto.toLowerCase()));

  const seleccionar=p=>{
    setTexto(p.nombre_proveedor);
    onSeleccionar(p);
    setAbierto(false);
  };

  return(
    <div ref={ref} style={{position:'relative',width:'100%'}}>
      <div className="input-group">
        <span className="input-group-text"><FiSearch size={14}/></span>
        <input
          type="text"
          className="form-control"
          placeholder="Buscar proveedor..."
          value={texto}
          onChange={e=>{
            setTexto(e.target.value);
            onSeleccionar(null);
            setAbierto(e.target.value.trim().length>0);
          }}
          autoComplete="off"
        />
      </div>

      {abierto&&filtrados.length>0&&(
        <ListaDesplegable
          items={filtrados.slice(0,8)}
          onSelect={seleccionar}
          renderItem={p=>(
            <span>
              {p.nombre_proveedor}
              {p.pais&&<span className="text-muted ms-2" style={{fontSize:12}}>({p.pais})</span>}
            </span>
          )}
        />
      )}
    </div>
  );
};

// Buscador de producto
const BuscadorProducto=({onAgregar,idsUsados})=>{
  const [texto,setTexto]=useState('');
  const [todos,setTodos]=useState([]);
  const [cargando,setCargando]=useState(true);
  const [error,setError]=useState(false);
  const [abierto,setAbierto]=useState(false);
  const ref=useRef(null);

  useEffect(()=>{
    setCargando(true);
    setError(false);
    comprasService.productosDisponibles({buscar:''})
      .then(r=>{
        if(r.data.ok) setTodos(r.data.datos||[]);
        else setError(true);
      })
      .catch(err=>{
        console.error('Error cargando productos:',err);
        setError(true);
      })
      .finally(()=>setCargando(false));
  },[]);

  useEffect(()=>{
    const fn=e=>{if(ref.current&&!ref.current.contains(e.target)) setAbierto(false);};
    document.addEventListener('mousedown',fn);
    return()=>document.removeEventListener('mousedown',fn);
  },[]);

  const filtrados=todos.filter(p=>
    !idsUsados.includes(p.cod_producto)&&
    texto.trim()&&
    p.nombre_producto.toLowerCase().includes(texto.toLowerCase())
  );

  const seleccionar=prod=>{
    const precio=parseFloat(prod.precio_venta||0);
    const porcIsv=parseFloat(prod.isv_porcentaje||0);
    const isv=parseFloat((precio*porcIsv/100).toFixed(2));

    onAgregar({
      cod_producto:prod.cod_producto,
      nombre_producto:prod.nombre_producto,
      cantidad:1,
      precio,
      isv,
      subtotal:parseFloat((precio+isv).toFixed(2))
    });

    setTexto('');
    setAbierto(false);
  };

  const placeholder=cargando
    ?'Cargando productos...'
    :error
      ?'Error al cargar productos'
      :`Buscar entre ${todos.length} productos...`;

  return(
    <div ref={ref} style={{position:'relative',width:'100%'}}>
      <div className="input-group">
        <span className="input-group-text">
          {cargando
            ?<span className="spinner-border spinner-border-sm" style={{width:14,height:14}}/>
            :<FiSearch size={14}/>
          }
        </span>

        <input
          type="text"
          className={`form-control ${error?'is-invalid':''}`}
          placeholder={placeholder}
          value={texto}
          disabled={cargando||error}
          onChange={e=>{
            setTexto(e.target.value);
            setAbierto(e.target.value.trim().length>0);
          }}
          autoComplete="off"
        />
      </div>

      {abierto&&filtrados.length>0&&(
        <ListaDesplegable
          items={filtrados.slice(0,10)}
          onSelect={seleccionar}
          renderItem={p=>(
            <span>
              {p.nombre_producto}
              <span className="text-muted ms-2" style={{fontSize:12}}>
                L. {parseFloat(p.precio_venta||0).toFixed(2)}
              </span>
            </span>
          )}
        />
      )}

      {abierto&&filtrados.length===0&&todos.length>0&&texto.trim()&&(
        <div style={{position:'absolute',zIndex:1060,top:'100%',left:0,right:0,background:'#fff',border:'1px solid #dee2e6',borderRadius:6,padding:'10px 14px',fontSize:13,color:'#888'}}>
          No se encontraron productos con "{texto}"
        </div>
      )}

      {error&&(
        <small className="text-danger d-block mt-1">
          No se pudieron cargar los productos. Verifica tu conexión.
        </small>
      )}
    </div>
  );
};

// Modal rápido de producto
const ModalFormProducto=({onClose,onCreado})=>{
  const {crear,saving}=useProducto();

  const handleSubmit=async payload=>{
    const productoCreado=await crear(payload);
    if(productoCreado){
      onCreado({
        nombre_producto:productoCreado.nombre_producto||payload.nombre_producto,
        precio_venta:productoCreado.precio_venta||payload.precio_venta,
        isv_porcentaje:0
      });
      onClose();
    }
  };

  return(
    <div className="modal show d-block" style={{backgroundColor:'rgba(0,0,0,0.65)',zIndex:1070,overflowY:'auto'}}>
      <div className="modal-dialog modal-xl" style={{maxWidth:860}}>
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Nuevo Producto</h5>
            <button className="btn-close" onClick={onClose}/>
          </div>
          <div className="modal-body p-0">
            <ProductoForm saving={saving} onSubmit={handleSubmit} onCancelEdit={onClose}/>
          </div>
        </div>
      </div>
    </div>
  );
};

// Formulario principal
const FormOrden=({titulo,ocNumero,lineasIniciales=[],formInicial,onClose,onGuardar})=>{
  const [form,setForm]=useState(formInicial);
  const [proveedor,setProveedor]=useState(
    formInicial.cod_proveedor
      ?{cod_proveedor:formInicial.cod_proveedor,nombre_proveedor:formInicial.nombre_proveedor||''}
      :null
  );
  const [lineas,setLineas]=useState(lineasIniciales);
  const [guardando,setGuardando]=useState(false);
  const [modalProv,setModalProv]=useState(false);
  const [modalProd,setModalProd]=useState(false);
  const [todosProveedor,setTodosProveedor]=useState([]);
  const [keyProd,setKeyProd]=useState(0);

  useEffect(()=>{
    proveedorService.listar({limite:200,pagina:1})
      .then(r=>{if(r.data.ok) setTodosProveedor(r.data.datos||[]);})
      .catch(()=>{});
  },[]);

  const actualizarLinea=(idx,campo,valor)=>{
    setLineas(prev=>prev.map((l,i)=>{
      if(i!==idx) return l;
      const u={...l,[campo]:valor};
      u.subtotal=parseFloat((((parseFloat(u.precio||0)+parseFloat(u.isv||0))*parseInt(u.cantidad||1)).toFixed(2)));
      return u;
    }));
  };

  const eliminarLinea=idx=>setLineas(prev=>prev.filter((_,i)=>i!==idx));

  const agregarLinea=prod=>{
    if(lineas.find(l=>l.cod_producto===prod.cod_producto)) return toast.warning('El producto ya está en la lista');
    setLineas(prev=>[...prev,prod]);
  };

  const total=lineas.reduce((s,l)=>s+parseFloat(l.subtotal||0),0);

  const guardar=async()=>{
    if(!proveedor?.cod_proveedor) return toast.warning('Selecciona un proveedor');
    if(lineas.length===0) return toast.warning('Agrega al menos un producto');

    setGuardando(true);
    try{
      await onGuardar({...form,cod_proveedor:proveedor.cod_proveedor,detalles:lineas});
    }finally{
      setGuardando(false);
    }
  };

  return(
    <>
      <div className="modal show d-block" style={{backgroundColor:'rgba(0,0,0,0.55)',zIndex:1050}}>
        <div className="modal-dialog modal-xl" style={{maxWidth:1100}}>
          <div className="modal-content" style={{borderRadius:12}}>
            <div className="modal-header" style={{background:'#111',borderRadius:'12px 12px 0 0',padding:'14px 22px'}}>
              <h5 className="modal-title d-flex align-items-center gap-2" style={{color:'#fff',fontWeight:700}}>
                <FiPlus size={18}/>
                {titulo}
                {ocNumero&&(
                  <span style={{background:'#2563eb',color:'#fff',fontSize:12,fontWeight:700,borderRadius:20,padding:'2px 12px'}}>
                    {ocNumero}
                  </span>
                )}
              </h5>
              <button className="btn-close btn-close-white" onClick={onClose}/>
            </div>

            <div className="modal-body" style={{padding:'24px 28px'}}>
              <div className="mb-4">
                <label className="form-label fw-semibold" style={{fontSize:13}}>Proveedor *</label>
                <div className="d-flex gap-2 align-items-stretch">
                  <div className="flex-grow-1">
                    <BuscadorProveedor valor={proveedor} proveedores={todosProveedor} onSeleccionar={setProveedor}/>
                  </div>
                  <button
                    type="button"
                    className="btn jyr-btn-primary"
                    style={{whiteSpace:'nowrap',minWidth:110}}
                    onClick={()=>setModalProv(true)}
                  >
                    + Nuevo
                  </button>
                </div>
              </div>

              <div className="row g-3 mb-4">
                <div className="col-md-2">
                  <label className="form-label fw-semibold" style={{fontSize:13}}>Moneda</label>
                  <select
                    className="form-select"
                    value={form.moneda}
                    onChange={e=>setForm({...form,moneda:e.target.value})}
                  >
                    <option value="HNL">HNL</option>
                    <option value="USD">USD</option>
                  </select>
                </div>

                <div className="col-md-10">
                  <label className="form-label fw-semibold" style={{fontSize:13}}>Observaciones</label>
                  <input
                    type="text"
                    className="form-control"
                    value={form.observaciones}
                    onChange={e=>setForm({...form,observaciones:e.target.value})}
                    placeholder="Notas adicionales..."
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold mb-2" style={{fontSize:14}}>Agregar producto</label>
                <div className="d-flex gap-2 align-items-stretch">
                  <div className="flex-grow-1">
                    <BuscadorProducto key={keyProd} idsUsados={lineas.map(l=>l.cod_producto)} onAgregar={agregarLinea}/>
                  </div>
                  <button
                    type="button"
                    className="btn jyr-btn-primary"
                    style={{whiteSpace:'nowrap',minWidth:110}}
                    onClick={()=>setModalProd(true)}
                  >
                    + Nuevo
                  </button>
                </div>
              </div>

              <div className="table-responsive">
                <table className="table table-bordered mb-0" style={{fontSize:14}}>
                  <thead style={{background:'#f8f9fa'}}>
                    <tr>
                      <th>Producto</th>
                      <th className="text-center" style={{width:90}}>Cant.</th>
                      <th className="text-end" style={{width:140}}>Precio unit.</th>
                      <th className="text-end" style={{width:110}}>ISV</th>
                      <th className="text-end" style={{width:140}}>Subtotal</th>
                      <th style={{width:46}}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineas.length===0?(
                      <tr>
                        <td colSpan="6" className="text-center text-muted py-4" style={{fontSize:13}}>
                          Escribe para buscar y agregar productos
                        </td>
                      </tr>
                    ):lineas.map((l,i)=>(
                      <tr key={i}>
                        <td className="align-middle">{l.nombre_producto}</td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm text-center"
                            min={1}
                            value={l.cantidad}
                            onChange={e=>actualizarLinea(i,'cantidad',e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm text-end"
                            min={0}
                            step="0.01"
                            value={l.precio}
                            onChange={e=>actualizarLinea(i,'precio',e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="form-control form-control-sm text-end"
                            min={0}
                            step="0.01"
                            value={l.isv}
                            onChange={e=>actualizarLinea(i,'isv',e.target.value)}
                          />
                        </td>
                        <td className="text-end align-middle fw-semibold">{fmtMoneda(l.subtotal,form.moneda)}</td>
                        <td className="text-center align-middle">
                          <button className="btn btn-sm btn-outline-danger" onClick={()=>eliminarLinea(i)}>
                            <FiTrash2 size={13}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {lineas.length>0&&(
                    <tfoot>
                      <tr style={{background:'#f8f9fa'}}>
                        <td colSpan="4" className="text-end fw-bold">Total</td>
                        <td className="text-end fw-bold">{fmtMoneda(total,form.moneda)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            <div className="modal-footer" style={{padding:'14px 22px'}}>
              <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
              <button
                className="btn jyr-btn-primary"
                onClick={guardar}
                disabled={guardando}
                style={{background:'#111',borderColor:'#111',color:'#fff',fontWeight:700}}
              >
                {guardando?<span className="spinner-border spinner-border-sm me-2"/>:null}
                {ocNumero?'Guardar Cambios':'Crear Compra'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {modalProv&&(
        <ModalProveedor
          onClose={()=>setModalProv(false)}
          onGuardado={prov=>{
            if(!prov) return;
            // Agrega el proveedor recién creado a la lista y lo selecciona
            // para que aparezca de inmediato sin refrescar
            setTodosProveedor(prev=>
              prev.some(p=>p.cod_proveedor===prov.cod_proveedor)
                ?prev
                :[prov,...prev]
            );
            setProveedor(prov);
          }}
        />
      )}

      {modalProd&&(
        <ModalFormProducto
          onClose={()=>setModalProd(false)}
          onCreado={prod=>{
            const precio=parseFloat(prod.precio_venta||0);
            const porcIsv=parseFloat(prod.isv_porcentaje||0);
            const isv=parseFloat((precio*porcIsv/100).toFixed(2));

            setLineas(prev=>[...prev,{
              cod_producto:Date.now(),
              nombre_producto:prod.nombre_producto,
              cantidad:1,
              precio,
              isv,
              subtotal:parseFloat((precio+isv).toFixed(2))
            }]);

            setKeyProd(k=>k+1);
          }}
        />
      )}
    </>
  );
};

// Modal detalle
const ModalDetalle=({orden,onClose})=>(
  <div className="modal show d-block" style={{backgroundColor:'rgba(0,0,0,0.6)'}}>
    <div className="modal-dialog modal-xl">
      <div className="modal-content">
        <div className="modal-header">
          <h5 className="modal-title">
            <FiShoppingCart className="me-2"/>
            {fmtOC(orden.cod_orden_compra)} — {orden.nombre_proveedor}
          </h5>
          <button className="btn-close" onClick={onClose}/>
        </div>
        <div className="modal-body">
          <div className="row g-3 mb-4">
            <div className="col-md-3">
              <small className="text-muted d-block">Fecha</small>
              <strong>{fmtFecha(orden.fecha)}</strong>
            </div>
            <div className="col-md-3">
              <small className="text-muted d-block">Estado</small>
              <span className={`badge ${BADGE_ESTADO[orden.estado]||'bg-secondary'}`}>{orden.estado}</span>
            </div>
            <div className="col-md-3">
              <small className="text-muted d-block">Moneda</small>
              <strong>{orden.moneda}</strong>
            </div>
            <div className="col-md-3">
              <small className="text-muted d-block">Total</small>
              <strong>{fmtMoneda(orden.total,orden.moneda)}</strong>
            </div>
            {orden.observaciones&&(
              <div className="col-12">
                <small className="text-muted d-block">Observaciones</small>
                {orden.observaciones}
              </div>
            )}
          </div>

          <h6 className="fw-semibold mb-2">Productos</h6>

          <div className="table-responsive">
            <table className="table table-sm table-bordered mb-0">
              <thead className="table-light">
                <tr>
                  <th>Producto</th>
                  <th className="text-center">Cantidad</th>
                  <th className="text-end">Precio Unit.</th>
                  <th className="text-end">ISV</th>
                  <th className="text-end">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(orden.detalles||[]).map(d=>(
                  <tr key={d.cod_detalle_oc}>
                    <td>{d.nombre_producto}</td>
                    <td className="text-center">{d.cantidad}</td>
                    <td className="text-end">{fmtMoneda(d.precio,orden.moneda)}</td>
                    <td className="text-end">{fmtMoneda(d.isv,orden.moneda)}</td>
                    <td className="text-end"><strong>{fmtMoneda(d.subtotal,orden.moneda)}</strong></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="4" className="text-end fw-bold">Total</td>
                  <td className="text-end fw-bold">{fmtMoneda(orden.total,orden.moneda)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  </div>
);

// Componente principal
const OrdenesCompra=()=>{
  const confirm=useConfirm();
  const [ordenes,setOrdenes]=useState([]);
  const [cargando,setCargando]=useState(true);
  const [buscar,setBuscar]=useState('');
  const [filtroEstado,setFiltroEstado]=useState('');
  const [pagina,setPagina]=useState(1);
  const [totalPaginas,setTotalPaginas]=useState(1);
  const [modalNueva,setModalNueva]=useState(false);
  const [ordenDetalle,setOrdenDetalle]=useState(null);
  const [ordenEditar,setOrdenEditar]=useState(null);
  const [seleccionados,setSeleccionados]=useState([]);
  const [exportandoPdf,setExportandoPdf]=useState(false);

  const cargar=useCallback(async()=>{
    setCargando(true);
    try{
      const {data}=await comprasService.listar({pagina,limite:10,buscar,estado:filtroEstado});
      if(data.ok){
        setOrdenes(data.datos);
        setTotalPaginas(data.totalPaginas);
        setSeleccionados(prev=>prev.filter(id=>data.datos.some(o=>o.cod_orden_compra===id)));
      }
    }catch{
      toast.error('Error al cargar órdenes de compra');
    }finally{
      setCargando(false);
    }
  },[pagina,buscar,filtroEstado]);

  useEffect(()=>{cargar();},[cargar]);

  const idsPagina=useMemo(()=>ordenes.map(o=>o.cod_orden_compra),[ordenes]);
  const todosSeleccionados=idsPagina.length>0&&idsPagina.every(id=>seleccionados.includes(id));

  const toggleSeleccion=id=>{
    setSeleccionados(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
  };

  const toggleSeleccionPagina=()=>{
    if(todosSeleccionados) setSeleccionados(prev=>prev.filter(id=>!idsPagina.includes(id)));
    else setSeleccionados(prev=>[...new Set([...prev,...idsPagina])]);
  };

  const limpiarSeleccion=()=>setSeleccionados([]);

  const verDetalle=async id=>{
    try{
      const {data}=await comprasService.obtener(id);
      if(data.ok) setOrdenDetalle(data.datos);
    }catch{
      toast.error('Error al cargar la orden');
    }
  };

  const verEditar=async id=>{
    try{
      const {data}=await comprasService.obtener(id);
      if(data.ok) setOrdenEditar(data.datos);
    }catch{
      toast.error('Error al cargar la orden');
    }
  };

  const aprobarOrden=async id=>{
    try{
      await comprasService.cambiarEstado(id,{cod_estado_oc:2,observaciones:'Orden aprobada'});
      toast.success('Orden aprobada');
      cargar();
    }catch(err){
      toast.error(err.response?.data?.mensaje||'Error al aprobar');
    }
  };

  const cancelarOrden=async id=>{
    const ok=await confirmDialog({
      variant:'cancel',
      title:'Cancelar orden',
      text:'¿Cancelar esta orden? Esta acción no se puede deshacer.',
      confirmText:'Sí, cancelar'
    });
    if(!ok) return;

    try{
      await comprasService.cambiarEstado(id,{cod_estado_oc:5,observaciones:'Orden cancelada'});
      toast.success('Orden cancelada');
      cargar();
    }catch(err){
      toast.error(err.response?.data?.mensaje||'Error al cancelar');
    }
  };

  const eliminarOrden=async id=>{
    const ok=await confirmDialog({
      variant:'delete',
      title:'Eliminar orden',
      text:'¿Eliminar esta orden permanentemente?',
      confirmText:'Sí, eliminar'
    });
    if(!ok) return;

    try{
      await comprasService.eliminar(id);
      toast.success('Orden eliminada');
      cargar();
    }catch(err){
      toast.error(err.response?.data?.mensaje||'Error al eliminar');
    }
  };

  const handleCrear=async datos=>{
    try{
      await comprasService.crear(datos);
      toast.success('Orden de compra creada');
      setModalNueva(false);
      cargar();
    }catch(err){
      toast.error(err.response?.data?.mensaje||'Error al crear');
      throw err;
    }
  };

  const handleEditar=async datos=>{
    try{
      await comprasService.cambiarEstado(ordenEditar.cod_orden_compra,{cod_estado_oc:5,observaciones:'Reemplazada'});
      await comprasService.crear(datos);
      toast.success('Orden actualizada');
      setOrdenEditar(null);
      cargar();
    }catch(err){
      toast.error(err.response?.data?.mensaje||'Error al editar');
      throw err;
    }
  };

  const eliminarSeleccionados=async()=>{
    const cancelables=ordenes.filter(o=>seleccionados.includes(o.cod_orden_compra)&&o.estado==='Cancelada');

    if(cancelables.length===0){
      toast.warning('Solo se pueden eliminar órdenes en estado Cancelada');
      return;
    }

    const ok=await confirmDialog({
      variant:'delete',
      title:`Eliminar ${cancelables.length} orden(es)`,
      text:`Se eliminarán ${cancelables.length} orden(es) cancelada(s). Esta acción no se puede deshacer.`,
      confirmText:'Sí, eliminar'
    });

    if(!ok) return;

    let eliminadas=0;
    for(const o of cancelables){
      try{
        await comprasService.eliminar(o.cod_orden_compra);
        eliminadas++;
      }catch{}
    }

    limpiarSeleccion();
    if(eliminadas>0) toast.success(`${eliminadas} orden(es) eliminada(s)`);
    cargar();
  };

  const exportarPdf=async()=>{
    setExportandoPdf(true);

    try{
      const {data}=await comprasService.exportarPdf({buscar,estado:filtroEstado});
      const blob=new Blob([data],{type:'application/pdf'});
      const url=window.URL.createObjectURL(blob);
      const link=document.createElement('a');
      link.href=url;
      link.download='reporte-ordenes-compra.pdf';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Reporte de ordenes de compra exportado');
    }catch(err){
      toast.error(await obtenerMensajeErrorBlob(err,'Error al exportar ordenes de compra en PDF'));
    }finally{
      setExportandoPdf(false);
    }
  };

  return(
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="mb-0">Órdenes de Compra</h3>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="jyr-btn jyr-btn-primary"
            onClick={exportarPdf}
            disabled={exportandoPdf||cargando}
          >
            {exportandoPdf?<span className="spinner-border spinner-border-sm me-2"/>:<FiDownload className="me-2"/>}
            Exportar PDF
          </button>

          <button className="btn jyr-btn-primary" onClick={()=>setModalNueva(true)}>
            <FiPlus className="me-2"/>
            Nueva Orden
          </button>
        </div>
      </div>

      <div className="jyr-card mb-3">
        <div className="jyr-card-body py-2">
          <div className="row g-2">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text"><FiSearch/></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Buscar por proveedor..."
                  value={buscar}
                  onChange={e=>{
                    setBuscar(e.target.value);
                    setPagina(1);
                  }}
                />
                {buscar&&(
                  <button className="btn btn-outline-secondary" onClick={()=>{setBuscar('');setPagina(1);}}>
                    <FiX/>
                  </button>
                )}
              </div>
            </div>

            <div className="col-md-3">
              <select
                className="form-select"
                value={filtroEstado}
                onChange={e=>{
                  setFiltroEstado(e.target.value);
                  setPagina(1);
                }}
              >
                <option value="">Todos los estados</option>
                <option value="1">Pendiente</option>
                <option value="2">Aprobada</option>
                <option value="5">Cancelada</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {seleccionados.length>0&&(
        <div style={{padding:'10px 16px',marginBottom:12,background:'#eff6ff',border:'1px solid #bfdbfe',borderRadius:8,display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
          <span style={{fontSize:13,fontWeight:600,color:'#2563eb'}}>
            {seleccionados.length} orden(es) seleccionada(s)
            {ordenes.filter(o=>seleccionados.includes(o.cod_orden_compra)&&o.estado!=='Cancelada').length>0&&(
              <span style={{fontWeight:400,marginLeft:6,color:'#6b7280',fontSize:12}}>
                (solo las Canceladas se pueden eliminar)
              </span>
            )}
          </span>

          <button className="btn btn-sm btn-outline-danger" onClick={eliminarSeleccionados}>
            <FiTrash2 className="me-1"/>
            Eliminar seleccionados
          </button>

          <button className="btn btn-sm btn-outline-secondary ms-auto" onClick={limpiarSeleccion}>
            <FiX className="me-1"/>
            Limpiar selección
          </button>
        </div>
      )}

      <div className="jyr-card">
        <div className="jyr-card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead>
                <tr>
                  <th style={{width:44,textAlign:'center'}}>
                    <input
                      type="checkbox"
                      checked={todosSeleccionados}
                      onChange={toggleSeleccionPagina}
                      disabled={ordenes.length===0}
                      title="Seleccionar todos en esta página"
                    />
                  </th>
                  <th style={{width:50}}>#</th>
                  <th>Nº Orden</th>
                  <th>Proveedor</th>
                  <th>Fecha</th>
                  <th>Moneda</th>
                  <th className="text-end">Total</th>
                  <th>Estado</th>
                  <th>Usuario</th>
                  <th className="text-center">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {cargando?(
                  <tr>
                    <td colSpan="10" className="text-center py-4">
                      <div className="spinner-border spinner-border-sm"/>
                    </td>
                  </tr>
                ):ordenes.length===0?(
                  <tr>
                    <td colSpan="10" className="text-center text-muted py-4">
                      No se encontraron órdenes de compra
                    </td>
                  </tr>
                ):ordenes.map(o=>(
                  <tr key={o.cod_orden_compra}>
                    <td style={{textAlign:'center'}}>
                      <input
                        type="checkbox"
                        checked={seleccionados.includes(o.cod_orden_compra)}
                        onChange={()=>toggleSeleccion(o.cod_orden_compra)}
                        title={`Seleccionar ${fmtOC(o.cod_orden_compra)}`}
                      />
                    </td>

                    <td className="text-muted">{(pagina-1)*10+ordenes.indexOf(o)+1}</td>
                    <td><strong>{fmtOC(o.cod_orden_compra)}</strong></td>
                    <td>{o.nombre_proveedor}</td>
                    <td>{fmtFecha(o.fecha)}</td>
                    <td>{o.moneda}</td>
                    <td className="text-end">{fmtMoneda(o.total,o.moneda)}</td>
                    <td>
                      <span className={`badge ${BADGE_ESTADO[o.estado]||'bg-secondary'}`}>{o.estado}</span>
                    </td>
                    <td>{o.nombre_usuario}</td>

                    <td className="text-center">
                      <button className="btn btn-sm btn-outline-primary me-1" onClick={()=>verDetalle(o.cod_orden_compra)} title="Ver">
                        <FiEye/>
                      </button>

                      <button className="btn btn-sm btn-outline-secondary me-1" onClick={()=>verEditar(o.cod_orden_compra)} title="Editar">
                        <FiEdit2/>
                      </button>

                      {o.estado==='Pendiente'&&(
                        <button className="btn btn-sm btn-outline-success me-1" onClick={()=>aprobarOrden(o.cod_orden_compra)} title="Aprobar">
                          <FiCheck/>
                        </button>
                      )}

                      {!['Recibida','Cancelada'].includes(o.estado)&&(
                        <button className="btn btn-sm btn-outline-danger me-1" onClick={()=>cancelarOrden(o.cod_orden_compra)} title="Cancelar">
                          <FiX/>
                        </button>
                      )}

                      {o.estado==='Cancelada'&&(
                        <button className="btn btn-sm btn-outline-danger" onClick={()=>eliminarOrden(o.cod_orden_compra)} title="Eliminar">
                          <FiTrash2/>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-center mt-3">
        <nav>
          <ul className="pagination">
            <li className={`page-item ${pagina<=1?'disabled':''}`}>
              <button className="page-link" onClick={()=>setPagina(p=>p-1)}>Anterior</button>
            </li>

            {[...Array(totalPaginas)].map((_,i)=>(
              <li key={i} className={`page-item ${pagina===i+1?'active':''}`}>
                <button className="page-link" onClick={()=>setPagina(i+1)}>{i+1}</button>
              </li>
            ))}

            <li className={`page-item ${pagina>=totalPaginas?'disabled':''}`}>
              <button className="page-link" onClick={()=>setPagina(p=>p+1)}>Siguiente</button>
            </li>
          </ul>
        </nav>
      </div>

      {modalNueva&&(
        <FormOrden
          titulo="Nueva Compra"
          formInicial={{cod_proveedor:'',moneda:'HNL',observaciones:''}}
          onClose={()=>setModalNueva(false)}
          onGuardar={handleCrear}
        />
      )}

      {ordenEditar&&(
        <FormOrden
          titulo="Editar Compra"
          ocNumero={fmtOC(ordenEditar.cod_orden_compra)}
          formInicial={{
            cod_proveedor:ordenEditar.cod_proveedor,
            nombre_proveedor:ordenEditar.nombre_proveedor,
            moneda:ordenEditar.moneda||'HNL',
            observaciones:ordenEditar.observaciones||''
          }}
          lineasIniciales={(ordenEditar.detalles||[]).map(d=>({
            cod_producto:d.cod_producto,
            nombre_producto:d.nombre_producto,
            cantidad:d.cantidad,
            precio:parseFloat(d.precio),
            isv:parseFloat(d.isv),
            subtotal:parseFloat(d.subtotal)
          }))}
          onClose={()=>setOrdenEditar(null)}
          onGuardar={handleEditar}
        />
      )}

      {ordenDetalle&&<ModalDetalle orden={ordenDetalle} onClose={()=>setOrdenDetalle(null)}/>}
    </div>
  );
};

export default OrdenesCompra;
