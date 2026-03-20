import React, { useState, useEffect, useRef, useCallback } from 'react';
import { carruselService } from '../../services/serviceIndex.js';
import { toast } from 'react-toastify';
import { FiPlus, FiTrash2, FiImage, FiX, FiEdit2, FiCheck, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { resolveApiBase } from '../../utils/runtimeApi.js';

const API_BASE = resolveApiBase();

const CarruselPage = () => {
  const [imagenes, setImagenes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [editando, setEditando] = useState(null);
  const [editTitulo, setEditTitulo] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const fileInputRef = useRef(null);

  /* ── Cargar imágenes ── */
  const cargarImagenes = useCallback(async () => {
    try {
      const { data } = await carruselService.listarTodas();
      if (data.ok) setImagenes(data.datos);
    } catch (err) {
      console.error('Error cargando carrusel:', err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarImagenes(); }, [cargarImagenes]);

  /* ── Preview de archivo ── */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen no debe exceder 5MB');
      return;
    }
    setArchivoSeleccionado(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  /* ── Subir imagen ── */
  const handleSubir = async (e) => {
    e.preventDefault();
    if (!archivoSeleccionado) {
      toast.warning('Selecciona una imagen');
      return;
    }
    setSubiendo(true);
    try {
      const formData = new FormData();
      formData.append('imagen', archivoSeleccionado);
      if (titulo.trim()) formData.append('titulo', titulo.trim());
      if (descripcion.trim()) formData.append('descripcion', descripcion.trim());

      const { data } = await carruselService.subir(formData);
      if (data.ok) {
        toast.success(data.mensaje);
        cerrarModal();
        await cargarImagenes();
      }
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al subir imagen');
    } finally {
      setSubiendo(false);
    }
  };

  /* ── Eliminar imagen ── */
  const handleEliminar = async (codImagen) => {
    if (!confirm('¿Eliminar esta imagen del carrusel del Login?')) return;
    try {
      const { data } = await carruselService.eliminar(codImagen);
      if (data.ok) {
        toast.success(data.mensaje);
        await cargarImagenes();
      }
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al eliminar');
    }
  };

  /* ── Editar datos ── */
  const iniciarEdicion = (img) => {
    setEditando(img.cod_imagen);
    setEditTitulo(img.titulo || '');
    setEditDescripcion(img.descripcion || '');
  };

  const guardarEdicion = async (codImagen) => {
    try {
      const { data } = await carruselService.actualizar(codImagen, {
        titulo: editTitulo.trim() || null,
        descripcion: editDescripcion.trim() || null
      });
      if (data.ok) {
        toast.success('Imagen actualizada');
        setEditando(null);
        await cargarImagenes();
      }
    } catch (err) {
      toast.error('Error al actualizar');
    }
  };

  /* ── Cambiar orden ── */
  const cambiarOrden = async (codImagen, nuevoOrden) => {
    try {
      await carruselService.actualizar(codImagen, { orden: nuevoOrden });
      await cargarImagenes();
    } catch (err) {
      toast.error('Error al cambiar orden');
    }
  };

  /* ── Toggle activo ── */
  const toggleActivo = async (img) => {
    try {
      const { data } = await carruselService.actualizar(img.cod_imagen, { activo: !img.activo });
      if (data.ok) {
        toast.success(img.activo ? 'Imagen desactivada' : 'Imagen activada');
        await cargarImagenes();
      }
    } catch (err) {
      toast.error('Error al cambiar estado');
    }
  };

  /* ── Modal helpers ── */
  const cerrarModal = () => {
    setMostrarModal(false);
    setTitulo('');
    setDescripcion('');
    setArchivoSeleccionado(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getImgSrc = (img) => {
    if (img.imagen_url.startsWith('http')) return img.imagen_url;
    return `${API_BASE}${img.imagen_url}`;
  };

  if (cargando) return <div className="jyr-spinner" />;

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h3 className="mb-1" style={{ color: '#fff' }}>Gestión del Carrusel</h3>
          <p className="text-muted mb-0">Administra las imágenes que se muestran en la pantalla de Login</p>
        </div>
        <button className="btn jyr-btn-primary" onClick={() => setMostrarModal(true)}>
          <FiPlus className="me-1" /> Agregar imagen
        </button>
      </div>

      {/* Grid de imágenes */}
      {imagenes.length === 0 ? (
        <div className="carrusel-empty">
          <FiImage size={48} style={{ color: '#666', marginBottom: 12 }} />
          <p style={{ color: '#999', margin: 0 }}>No hay imágenes en el carrusel</p>
          <p style={{ color: '#666', fontSize: '0.85rem' }}>Agrega imágenes para que aparezcan en la pantalla de Login</p>
        </div>
      ) : (
        <div className="row g-3">
          {imagenes.map((img, index) => (
            <div key={img.cod_imagen} className="col-md-6 col-lg-4">
              <div className={`carrusel-card ${!img.activo ? 'carrusel-card-inactive' : ''}`}>
                {/* Imagen preview */}
                <div className="carrusel-card-img-wrapper">
                  <img src={getImgSrc(img)} alt={img.titulo || 'Imagen'} className="carrusel-card-img" />
                  {!img.activo && <div className="carrusel-card-inactive-badge">Desactivada</div>}
                  <div className="carrusel-card-order">#{img.orden}</div>
                </div>

                {/* Info */}
                <div className="carrusel-card-body">
                  {editando === img.cod_imagen ? (
                    <div>
                      <input
                        type="text"
                        className="form-control form-control-sm jyr-input mb-2"
                        value={editTitulo}
                        onChange={(e) => setEditTitulo(e.target.value)}
                        placeholder="Título"
                      />
                      <input
                        type="text"
                        className="form-control form-control-sm jyr-input mb-2"
                        value={editDescripcion}
                        onChange={(e) => setEditDescripcion(e.target.value)}
                        placeholder="Descripción"
                      />
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm jyr-btn-primary" onClick={() => guardarEdicion(img.cod_imagen)}>
                          <FiCheck className="me-1" /> Guardar
                        </button>
                        <button className="btn btn-sm jyr-btn-secondary" onClick={() => setEditando(null)}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h6 className="mb-1" style={{ color: '#fff' }}>{img.titulo || <span className="text-muted fst-italic">Sin título</span>}</h6>
                      <small className="text-muted">{img.descripcion || 'Sin descripción'}</small>
                    </div>
                  )}
                </div>

                {/* Acciones */}
                {editando !== img.cod_imagen && (
                  <div className="carrusel-card-actions">
                    <button className="carrusel-action-btn" onClick={() => iniciarEdicion(img)} title="Editar">
                      <FiEdit2 size={14} />
                    </button>
                    {index > 0 && (
                      <button className="carrusel-action-btn" onClick={() => cambiarOrden(img.cod_imagen, img.orden - 1)} title="Subir">
                        <FiArrowUp size={14} />
                      </button>
                    )}
                    {index < imagenes.length - 1 && (
                      <button className="carrusel-action-btn" onClick={() => cambiarOrden(img.cod_imagen, img.orden + 1)} title="Bajar">
                        <FiArrowDown size={14} />
                      </button>
                    )}
                    <button
                      className={`carrusel-action-btn ${img.activo ? 'text-success' : 'text-warning'}`}
                      onClick={() => toggleActivo(img)}
                      title={img.activo ? 'Desactivar' : 'Activar'}
                    >
                      {img.activo ? '●' : '○'}
                    </button>
                    <button className="carrusel-action-btn text-danger" onClick={() => handleEliminar(img.cod_imagen)} title="Eliminar">
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Modal subir imagen ─── */}
      {mostrarModal && (
        <div className="carrusel-modal-overlay" onClick={cerrarModal}>
          <div className="carrusel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="carrusel-modal-header">
              <h5 className="mb-0">Agregar imagen al carrusel</h5>
              <button className="carrusel-modal-close" onClick={cerrarModal}><FiX size={20} /></button>
            </div>
            <form onSubmit={handleSubir}>
              <div className="carrusel-modal-body">
                <div
                  className="carrusel-dropzone"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="carrusel-preview-img" />
                  ) : (
                    <>
                      <FiImage size={40} style={{ color: '#666' }} />
                      <p className="mt-2 mb-0" style={{ color: '#999' }}>Haz clic para seleccionar una imagen</p>
                      <small style={{ color: '#666' }}>JPG, PNG, GIF, WebP — Máx 5MB</small>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                </div>

                <div className="mt-3">
                  <label className="form-label text-light">Título (opcional)</label>
                  <input
                    type="text"
                    className="form-control jyr-input"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ej: Promoción de temporada"
                    maxLength={100}
                  />
                </div>
                <div className="mt-2">
                  <label className="form-label text-light">Descripción (opcional)</label>
                  <input
                    type="text"
                    className="form-control jyr-input"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Ej: 20% de descuento en rines"
                    maxLength={255}
                  />
                </div>
              </div>

              <div className="carrusel-modal-footer">
                <button type="button" className="btn jyr-btn-secondary" onClick={cerrarModal}>Cancelar</button>
                <button type="submit" className="btn jyr-btn-primary" disabled={subiendo || !archivoSeleccionado}>
                  {subiendo ? 'Subiendo...' : 'Subir imagen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarruselPage;
