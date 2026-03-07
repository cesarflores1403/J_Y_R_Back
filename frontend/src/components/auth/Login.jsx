import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { toast } from 'react-toastify';
import { FiUser, FiLock, FiLogIn } from 'react-icons/fi';
import logoFull from '../../assets/img/logo1.jpeg';
import logoClean from '../../assets/img/logo2.jpeg';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Colores por marca (opcional – se usa si el título coincide)
const coloresMarca = {
  Toyota: '#EB0A1E',
  Chevrolet: '#D4AF37',
  Hyundai: '#002C5F',
  Nissan: '#C3002F',
  Honda: '#CC0000',
  Suzuki: '#E4002B',
  Mitsubishi: '#E60012',
};

const Login = () => {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState([]);
  const { iniciarSesion } = useAuth();
  const navigate = useNavigate();

  // Cargar imágenes del carrusel SOLO desde la BD
  useEffect(() => {
    const cargarSlides = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/carrusel`);
        if (data.ok && data.datos.length > 0) {
          const imagenesDB = data.datos.map(img => ({
            nombre: img.titulo || '',
            logo: img.imagen_url.startsWith('http')
              ? img.imagen_url
              : `${API_BASE}${img.imagen_url}`,
            color: coloresMarca[img.titulo] || '#dc2626',
          }));
          setSlides(imagenesDB);
        }
      } catch (err) {
        console.error('Error cargando carrusel:', err);
      }
    };
    cargarSlides();
  }, []);

  // Auto-slide cada 2.25 segundos
  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 1500);
    return () => clearInterval(timer);
  }, [slides.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      await iniciarSesion(nombreUsuario, password);
      toast.success('¡Bienvenido al sistema JYR!');
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.mensaje || err.message || 'Error al iniciar sesión';
      setError(msg);
      toast.error(msg);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-split">
      {/* ===== LADO IZQUIERDO — CARRUSEL ===== */}
      <div className="login-carousel-side">
        <div className="login-carousel-bg" />

        {/* Indicadores superiores */}
        <div className="login-carousel-indicators">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`login-indicator ${i === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(i)}
            />
          ))}
        </div>

        {/* Slides */}
        <div className="login-carousel-track">
          {slides.map((marca, i) => (
            <div
              key={`${marca.nombre}-${i}`}
              className={`login-slide ${i === currentSlide ? 'active' : ''}`}
            >
              <div className="login-slide-glow" style={{ background: marca.color }} />
              <img
                src={marca.logo}
                alt={marca.nombre}
                className="login-slide-img"
              />
              <h2 className="login-slide-name">{marca.nombre}</h2>
            </div>
          ))}
        </div>

        {/* Texto inferior */}
        <div className="login-carousel-footer">
          <img src={logoClean} alt="J&R" className="login-carousel-jyr-logo" />
          <p>Trabajamos con las mejores marcas del mercado automotriz</p>
        </div>
      </div>

      {/* ===== LADO DERECHO — FORMULARIO ===== */}
      <div className="login-form-side">
        <div className="login-form-wrapper">
          <div className="text-center mb-4">
            <img src={logoFull} alt="J&R" className="login-form-logo" />
            <h2 className="login-title">Iniciar Sesión</h2>
            <p className="login-subtitle">Ingresa tus credenciales para acceder</p>
          </div>

          {error && (
            <div className="alert alert-danger d-flex align-items-center" role="alert">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label login-label">Usuario</label>
              <div className="input-group">
                <span className="input-group-text login-input-icon"><FiUser /></span>
                <input
                  type="text"
                  className="form-control login-input"
                  placeholder="Nombre de usuario"
                  value={nombreUsuario}
                  onChange={(e) => setNombreUsuario(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label login-label">Contraseña</label>
              <div className="input-group">
                <span className="input-group-text login-input-icon"><FiLock /></span>
                <input
                  type="password"
                  className="form-control login-input"
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn w-100 login-btn" disabled={cargando}>
              {cargando ? (
                <span className="spinner-border spinner-border-sm me-2" />
              ) : (
                <FiLogIn className="me-2" />
              )}
              {cargando ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="text-center mt-4">
            <small className="login-footer-text">J & R Accesorios & Reparaciones</small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
