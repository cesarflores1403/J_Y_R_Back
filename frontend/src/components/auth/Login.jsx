import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { toast } from 'react-toastify';
import { FiUser, FiLock, FiLogIn } from 'react-icons/fi';
import logoFull from '../../assets/img/logo1.jpeg';
import logoClean from '../../assets/img/logo2.jpeg';

import marcaToyota from '../../assets/img/marca_toyota.png';
import marcaChevrolet from '../../assets/img/marca_chevrolet.png';
import marcaHyundai from '../../assets/img/marca_hyundai.png';
import marcaNissan from '../../assets/img/marca_nissan.png';
import marcaHonda from '../../assets/img/marca_honda.png';
import marcaSuzuki from '../../assets/img/marca_suzuki.png';
import marcaMitsubishi from '../../assets/img/marca_mitsubishi.svg';

const marcas = [
  { nombre: 'Toyota',     logo: marcaToyota,     color: '#EB0A1E' },
  { nombre: 'Chevrolet',  logo: marcaChevrolet,  color: '#D4AF37' },
  { nombre: 'Hyundai',    logo: marcaHyundai,    color: '#002C5F' },
  { nombre: 'Nissan',     logo: marcaNissan,     color: '#C3002F' },
  { nombre: 'Honda',      logo: marcaHonda,      color: '#CC0000' },
  { nombre: 'Suzuki',     logo: marcaSuzuki,     color: '#E4002B' },
  { nombre: 'Mitsubishi', logo: marcaMitsubishi, color: '#E60012' },
];

const Login = () => {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [password, setPassword]           = useState('');
  const [cargando, setCargando]           = useState(false);
  const [error, setError]                 = useState('');
  const [currentSlide, setCurrentSlide]   = useState(0);
  const { iniciarSesion } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % marcas.length);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
                  required autoFocus />
              </div>
            </div>

            <div className="mb-2">
              <label className="form-label login-label">Contraseña</label>
              <div className="input-group">
                <span className="input-group-text login-input-icon"><FiLock /></span>
                <input type="password" className="form-control login-input"
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required />
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
