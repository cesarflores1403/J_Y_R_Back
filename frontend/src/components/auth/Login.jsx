import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { toast } from 'react-toastify';
import { FiUser, FiLock, FiLogIn, FiEye, FiEyeOff } from 'react-icons/fi';
import logoFull from '../../assets/img/logo1.jpeg';
import logoClean from '../../assets/img/logo2.jpeg';
import axios from 'axios';
import { resolveApiBase } from '../../utils/runtimeApi.js';

const API_BASE = resolveApiBase();

const Login = () => {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [password, setPassword]           = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando]           = useState(false);
  const [error, setError]                 = useState('');
  const [currentSlide, setCurrentSlide]   = useState(0);
  const [marcas, setMarcas]               = useState([]);
  const { iniciarSesion } = useAuth();
  const navigate = useNavigate();

  /* ── Cargar imágenes del carrusel desde la BD ── */
  useEffect(() => {
    const cargar = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/carrusel`);
        if (data.ok && data.datos?.length > 0) {
          setMarcas(data.datos.map(img => ({
            nombre: img.titulo || '',
            logo: img.imagen_url.startsWith('http') ? img.imagen_url : `${API_BASE}${img.imagen_url}`,
            color: '#CC0000',
          })));
        }
      } catch (err) {
        console.error('Error cargando carrusel:', err);
      }
    };
    cargar();
  }, []);

  useEffect(() => {
    if (marcas.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % marcas.length);
    }, 1000);
    return () => clearInterval(timer);
  }, [marcas.length]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const usuarioLimpio = nombreUsuario.trim();
      await iniciarSesion(usuarioLimpio, password);
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

        <div className="login-carousel-indicators">
          {marcas.map((_, i) => (
            <button key={i}
              className={`login-indicator ${i === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(i)} />
          ))}
        </div>

        <div className="login-carousel-track">
          {marcas.map((marca, i) => (
            <div key={marca.nombre}
              className={`login-slide ${i === currentSlide ? 'active' : ''}`}>
              <div className="login-slide-glow" style={{ background: marca.color }} />
              <img src={marca.logo} alt={marca.nombre} className="login-slide-img" />
              <h2 className="login-slide-name">{marca.nombre}</h2>
            </div>
          ))}
        </div>

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
                <input type="text" className="form-control login-input"
                  placeholder="Nombre de usuario"
                  value={nombreUsuario}
                  onChange={(e) => setNombreUsuario(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="username"
                  required autoFocus />
              </div>
            </div>

            <div className="mb-2">
              <label className="form-label login-label">Contraseña</label>
              <div className="input-group">
                <span className="input-group-text login-input-icon"><FiLock /></span>
                <input type={mostrarPassword ? 'text' : 'password'} className="form-control login-input"
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="current-password"
                  required />
                <button
                  type="button"
                  className="input-group-text login-input-icon"
                  onClick={() => setMostrarPassword((prev) => !prev)}
                  aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  title={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {mostrarPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            <div className="text-end mb-4">
              <button type="button" className="btn btn-link p-0 text-decoration-none"
                style={{ fontSize: '0.85rem', color: '#6c757d' }}
                onClick={() => navigate('/recuperar-password')}>
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button type="submit" className="btn w-100 login-btn" disabled={cargando}>
              {cargando
                ? <span className="spinner-border spinner-border-sm me-2" />
                : <FiLogIn className="me-2" />}
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
