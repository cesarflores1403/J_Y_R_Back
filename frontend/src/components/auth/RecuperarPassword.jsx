import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiArrowLeft } from 'react-icons/fi';
import logoFull from '../../assets/img/logo1.jpeg';
import logoClean from '../../assets/img/logo2.jpeg';
import { authService } from '../../services/serviceIndex.js';
import { alertDialog } from '../../utils/notifications.js';
import axios from 'axios';
import { resolveApiBase } from '../../utils/runtimeApi.js';
import {
  MAX_USUARIO, USUARIO_PERMITIDO,
  sanitizarUsuario, contieneEmoji, contienePatronSQL, contieneHTML,
} from '../../utils/authValidators.js';

const API_BASE = resolveApiBase();

// Mensaje genérico al detectar símbolos no permitidos (HTML/SQL): no revela la razón de seguridad.
const MSG_NO_PERMITIDO = 'Se ingresaron caracteres no permitidos.';

const precargarCarrusel = (items = []) => {
  if (!items.length) return;

  const [primera, ...resto] = items;
  const imagenPrincipal = new Image();
  imagenPrincipal.src = primera.logo;

  resto.forEach((item, index) => {
    setTimeout(() => {
      const img = new Image();
      img.src = item.logo;
    }, 250 * (index + 1));
  });
};

const RecuperarPassword = () => {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [marcas, setMarcas] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    let activo = true;
    let reintentoId = null;

    const cargar = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/carrusel`);
        if (activo && data.ok && data.datos?.length > 0) {
          const imagenes = data.datos.map((img) => ({
            nombre: img.titulo || '',
            logo: img.imagen_url.startsWith('http') ? img.imagen_url : `${API_BASE}${img.imagen_url}`,
            color: '#CC0000'
          }));

          setMarcas(imagenes);
          precargarCarrusel(imagenes);
        }
      } catch (err) {
        console.error('Error cargando carrusel:', err);
        if (activo) reintentoId = setTimeout(cargar, 3000);
      }
    };
    cargar();

    return () => {
      activo = false;
      if (reintentoId) clearTimeout(reintentoId);
    };
  }, []);

  useEffect(() => {
    if (marcas.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % marcas.length);
    }, 1000);
    return () => clearInterval(timer);
  }, [marcas.length]);

  // ── Bloquea la escritura/pegado de emojis y caracteres no permitidos ──
  const handleUsuarioChange = (e) => {
    const original = e.target.value;
    const limpio = sanitizarUsuario(original).slice(0, MAX_USUARIO);
    if (limpio !== original) {
      if (contieneEmoji(original)) setError('Los emojis no están permitidos.');
      else if (contieneHTML(original) || contienePatronSQL(original)) setError(MSG_NO_PERMITIDO);
      else setError('El usuario solo admite letras, números y los símbolos . _ - @');
    } else {
      setError('');
    }
    setNombreUsuario(limpio);
  };

  const handleEnviar = async (e) => {
    e.preventDefault();
 setError('');
 
 const usuarioLimpio = nombreUsuario.trim();
    if (!usuarioLimpio) {
          setError('Ingresa tu nombre de usuario (no puede contener solo espacios).');
          return;
        }
        if (usuarioLimpio.length > MAX_USUARIO) {
          setError('El nombre de usuario no puede exceder los 50 caracteres.');
          return;
        }
        if (contieneHTML(usuarioLimpio) || contienePatronSQL(usuarioLimpio)) {
          setError(MSG_NO_PERMITIDO);
          return;
        }
        if (!USUARIO_PERMITIDO.test(usuarioLimpio)) {
          setError('El usuario solo admite letras, números y los símbolos . _ - @ (sin emojis).');
          return;
        }   
         setEnviando(true);

    try {
      await authService.solicitarRecuperacion({ nombre_usuario: usuarioLimpio });
      setEnviando(false);
      setNombreUsuario('');
      await alertDialog({
        title: 'Aviso',
        text: 'Ya se ha enviado la solicitud de cambio de contraseña a los administradores.',
        icon: 'success',
        confirmText: 'Entendido'
      });
    } catch (error) {
      setEnviando(false);
      setError(
        error.response?.data?.mensaje
        || error.response?.data?.message
        || 'No se pudo enviar la solicitud'
      );   
     }
  };

  return (
    <div className="login-split">
      {/* Lado izquierdo decorativo */}
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
            <div key={marca.nombre || i}
              className={`login-slide ${i === currentSlide ? 'active' : ''}`}>
              <div className="login-slide-glow" style={{ background: marca.color }} />
              <img
                src={marca.logo}
                alt={marca.nombre}
                className="login-slide-img"
                loading={i === currentSlide ? 'eager' : 'lazy'}
                fetchPriority={i === currentSlide ? 'high' : 'auto'}
                decoding="async"
              />
            </div>
          ))}
        </div>

        <div className="login-carousel-footer">
          <img src={logoClean} alt="J&R" className="login-carousel-jyr-logo" />
          <p>Recupera el acceso a tu cuenta</p>
        </div>
      </div>

      {/* Formulario */}
      <div className="login-form-side">
        <div className="login-form-wrapper">
          <div className="text-center mb-4">
            <img src={logoFull} alt="J&R" className="login-form-logo" />
            <h2 className="login-title">Recuperar contraseña</h2>
            <p className="login-subtitle">Ingresa tu usuario para solicitar el cambio de contraseña</p>
          </div>
          {error && (
            <div className="alert alert-danger d-flex align-items-center" role="alert">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleEnviar}>
            <div className="mb-4">
              <label className="form-label login-label">Usuario</label>
              <div className="input-group">
                <span className="input-group-text login-input-icon"><FiUser /></span>
                <input
                  type="text"
                  className="form-control login-input"
                  placeholder="Ingresa tu usuario"
                  value={nombreUsuario}
                  onChange={handleUsuarioChange}
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
                                    autoComplete="username"
                                    maxLength={MAX_USUARIO}
                                    required
                                    autoFocus
                />
              </div>
            </div>

            <button type="submit" className="btn w-100 login-btn mb-3" disabled={enviando}>
              {enviando
                ? <span className="spinner-border spinner-border-sm me-2" />
                : null}
              {enviando ? 'Enviando...' : 'Enviar solicitud'}
            </button>

            <button type="button"
              className="btn w-100 btn-outline-secondary"
              onClick={() => navigate('/login')}>
              <FiArrowLeft className="me-2" />
              Volver al inicio de sesión
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

export default RecuperarPassword;
