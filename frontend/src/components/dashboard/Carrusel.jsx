import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { carruselService } from '../../services/serviceIndex.js';
import { toast } from 'react-toastify';
import { FiPlus, FiTrash2, FiChevronLeft, FiChevronRight, FiImage, FiX } from 'react-icons/fi';
import { resolveApiBase } from '../../utils/runtimeApi.js';
import ContadorLimite from '../common/ContadorLimite.jsx';

// Marcas de carros (mismas del Login)
import marcaToyota from '../../assets/img/marca_toyota.png';
import marcaChevrolet from '../../assets/img/marca_chevrolet.png';
import marcaHyundai from '../../assets/img/marca_hyundai.png';
import marcaNissan from '../../assets/img/marca_nissan.png';
import marcaHonda from '../../assets/img/marca_honda.png';
import marcaSuzuki from '../../assets/img/marca_suzuki.png';
import marcaMitsubishi from '../../assets/img/marca_mitsubishi.svg';

const API_BASE = resolveApiBase();

const marcasDefault = [
  { titulo: 'Toyota', imagen: marcaToyota, color: '#EB0A1E' },
  { titulo: 'Chevrolet', imagen: marcaChevrolet, color: '#D4AF37' },
  { titulo: 'Hyundai', imagen: marcaHyundai, color: '#002C5F' },
  { titulo: 'Nissan', imagen: marcaNissan, color: '#C3002F' },
  { titulo: 'Honda', imagen: marcaHonda, color: '#CC0000' },
  { titulo: 'Suzuki', imagen: marcaSuzuki, color: '#E4002B' },
  { titulo: 'Mitsubishi', imagen: marcaMitsubishi, color: '#E60012' },
];

const Carrusel = () => {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'Administrador';

  const [imagenes, setImagenes] = useState([]);
  const [indiceActual, setIndiceActual] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);
  const intervalRef = useRef(null);

  /* ── Cargar imágenes ── */
  const cargarImagenes = useCallback(async () => {
    try {
      const { data } = await carruselService.listar();
      if (data.ok) setImagenes(data.datos);
    } catch (err) {
      console.error('Error cargando carrusel:', err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarImagenes(); }, [cargarImagenes]);

  /* ── Slides combinados: marcas default + imágenes de BD ── */
  const slides = [
    ...marcasDefault.map((m, i) => ({
      key: `marca-${i}`,
      tipo: 'marca',
      titulo: m.titulo,
      imagen: m.imagen,
      color: m.color
    })),
    ...imagenes.map((img) => ({
      key: `db-${img.cod_imagen}`,
      tipo: 'bd',
      cod_imagen: img.cod_imagen,
      titulo: img.titulo,
      descripcion: img.descripcion,
      imagen: img.imagen_url.startsWith('http') ? img.imagen_url : `${API_BASE}${img.imagen_url}`
    }))
  ];

  /* ── Auto-slide cada 3s ── */
  useEffect(() => {
    if (slides.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setIndiceActual(prev => (prev + 1) % slides.length);
    }, 3000);
    return () => clearInterval(intervalRef.current);
  }, [slides.length]);

  /* ── Navegación ── */
  const irAnterior = () => {
    clearInterval(intervalRef.current);
    setIndiceActual(prev => prev === 0 ? slides.length - 1 : prev - 1);
  };

  const irSiguiente = () => {
    clearInterval(intervalRef.current);
    setIndiceActual(prev => (prev + 1) % slides.length);
  };

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
    if (!confirm('¿Eliminar esta imagen del carrusel?')) return;
    try {
      const { data } = await carruselService.eliminar(codImagen);
      if (data.ok) {
        toast.success(data.mensaje);
        setIndiceActual(0);
        await cargarImagenes();
      }
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al eliminar');
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

  /* ── Render: sin imágenes ── */
  if (cargando) return <div className="jyr-spinner" />;

  if (slides.length === 0) {
    return (
      <div className="carrusel-wrapper">
        <div className="carrusel-header">
          <h5 className="carrusel-title">Carrusel</h5>
          {esAdmin && (
            <button className="btn btn-sm jyr-btn-primary" onClick={() => setMostrarModal(true)}>
              <FiPlus className="me-1" /> Agregar imagen
            </button>
          )}
        </div>
        <div className="carrusel-empty">
          <FiImage size={48} style={{ color: '#666', marginBottom: 12 }} />
          <p style={{ color: '#999', margin: 0 }}>No hay imágenes en el carrusel</p>
        </div>
        {mostrarModal && renderModal()}
      </div>
    );
  }

  /* ── Render principal ── */
  const slideActual = slides[indiceActual % slides.length];
  const esMarca = slideActual.tipo === 'marca';

  function renderModal() {
    return (
      <div className="carrusel-modal-overlay" onClick={cerrarModal}>
        <div className="carrusel-modal" onClick={(e) => e.stopPropagation()}>
          <div className="carrusel-modal-header">
            <h5 className="mb-0">Agregar imagen al carrusel</h5>
            <button className="carrusel-modal-close" onClick={cerrarModal}><FiX size={20} /></button>
          </div>
          <form onSubmit={handleSubir}>
            <div className="carrusel-modal-body">
              {/* Drop zone */}
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
                <ContadorLimite value={descripcion} max={255} />
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
    );
  }

  return (
    <div className="carrusel-wrapper">
      <div className="carrusel-header">
        <h5 className="carrusel-title">Carrusel</h5>
        {esAdmin && (
          <div className="carrusel-admin-bar">
            <button className="btn btn-sm jyr-btn-primary" onClick={() => setMostrarModal(true)}>
              <FiPlus className="me-1" /> Agregar imagen
            </button>
            <span className="carrusel-admin-count">{imagenes.length} imagen{imagenes.length !== 1 ? 'es' : ''} personalizada{imagenes.length !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
      <div className="carrusel-container">
        {/* Slide */}
        <div className={`carrusel-slide ${esMarca ? 'carrusel-slide-marca' : ''}`}
             style={esMarca ? { background: `radial-gradient(ellipse at center, ${slideActual.color}22 0%, #111 70%)` } : {}}>
          <img
            src={slideActual.imagen}
            alt={slideActual.titulo || 'Carrusel'}
            className={esMarca ? 'carrusel-marca-img' : 'carrusel-img'}
          />

          {/* Caption */}
          {slideActual.titulo && (
            <div className="carrusel-caption">
              <h4>{slideActual.titulo}</h4>
              {slideActual.descripcion && <p>{slideActual.descripcion}</p>}
            </div>
          )}

          {/* Botón eliminar (admin, solo imágenes de BD) */}
          {esAdmin && !esMarca && (
            <button
              className="carrusel-btn-delete"
              onClick={() => handleEliminar(slideActual.cod_imagen)}
              title="Eliminar esta imagen"
            >
              <FiTrash2 size={16} />
            </button>
          )}
        </div>

        {/* Flechas de navegación */}
        {slides.length > 1 && (
          <>
            <button className="carrusel-arrow carrusel-arrow-left" onClick={irAnterior}>
              <FiChevronLeft size={24} />
            </button>
            <button className="carrusel-arrow carrusel-arrow-right" onClick={irSiguiente}>
              <FiChevronRight size={24} />
            </button>
          </>
        )}

        {/* Indicadores */}
        {slides.length > 1 && (
          <div className="carrusel-indicators">
            {slides.map((_, i) => (
              <button
                key={i}
                className={`carrusel-dot ${i === indiceActual ? 'active' : ''}`}
                onClick={() => { clearInterval(intervalRef.current); setIndiceActual(i); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal subir */}
      {mostrarModal && renderModal()}
    </div>
  );
};

export default Carrusel;
