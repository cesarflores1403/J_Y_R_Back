import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { toast } from 'react-toastify';
import { FiUser, FiLock, FiLogIn, FiEye, FiEyeOff } from 'react-icons/fi';
import logoFull from '../../assets/img/logo1.jpeg';
import logoClean from '../../assets/img/logo2.jpeg';
import axios from 'axios';
import { resolveApiBase } from '../../utils/runtimeApi.js';
import {
  MAX_USUARIO, MAX_PASSWORD,
  USUARIO_PERMITIDO, PASSWORD_PERMITIDO,
  sanitizarUsuario, sanitizarPassword, contieneEmoji, contienePatronSQL, contieneHTML,
} from '../../utils/authValidators.js';

// Mensaje genérico al detectar símbolos no permitidos (HTML/SQL): no revela la razón de seguridad.
const MSG_NO_PERMITIDO = 'Se ingresaron caracteres no permitidos.';

const API_BASE = resolveApiBase();


// Máximo de intentos antes del bloqueo (debe coincidir con el backend).
const MAX_INTENTOS_LOGIN = 10;

// Estado del bloqueo/intentos persistido en el navegador para que sobreviva
// a un refresco de la página (el backend sigue siendo la barrera real).
const LOGIN_LOCK_KEY = 'jyr_login_lock';

const leerEstadoLogin = () => {
  try {
    return JSON.parse(localStorage.getItem(LOGIN_LOCK_KEY)) || {};
  } catch {
    return {};
  }
};
const guardarEstadoLogin = (estado) => {
  try {
    localStorage.setItem(LOGIN_LOCK_KEY, JSON.stringify(estado));
  } catch { /* almacenamiento no disponible: se ignora */ }
};
const limpiarEstadoLogin = () => {
  try {
    localStorage.removeItem(LOGIN_LOCK_KEY);
  } catch { /* almacenamiento no disponible: se ignora */ }
};

// Formatea segundos a mm:ss para la cuenta regresiva.
const formatearTiempo = (segundos) => {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};
const precargarCarrusel = (items = []) => {
  if (!items.length) return;

  const [primera, ...resto] = items;
  const imagenPrincipal = new Image();
  imagenPrincipal.src = primera.logo;

  // Precarga escalonada para no saturar la red al entrar al login.
  resto.forEach((item, index) => {
    setTimeout(() => {
      const img = new Image();
      img.src = item.logo;
    }, 250 * (index + 1));
  });
};

const Login = () => {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [password, setPassword]           = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando]           = useState(false);
  const [error, setError]                 = useState('');
  const [currentSlide, setCurrentSlide]   = useState(0);
  const [marcas, setMarcas]               = useState([]);
  // Estado de bloqueo por intentos fallidos (persistido para sobrevivir refrescos).
    const [bloqueadoHasta, setBloqueadoHasta] = useState(() => {
      const { bloqueadoHasta: hasta } = leerEstadoLogin();
      return hasta && hasta > Date.now() ? hasta : null;
    });
    const [restanteSeg, setRestanteSeg]     = useState(() => {
      const { bloqueadoHasta: hasta } = leerEstadoLogin();
      return hasta && hasta > Date.now() ? Math.ceil((hasta - Date.now()) / 1000) : 0;
    });
    // Guard síncrono contra doble envío (más fiable que el estado, que es asíncrono).
    const enviandoRef = useRef(false);
    const { iniciarSesion } = useAuth();
  const navigate = useNavigate();
  
    const bloqueado = Boolean(bloqueadoHasta && restanteSeg > 0);
  
    /* ── Cuenta regresiva del bloqueo (se reevalúa aunque se refresque) ── */
    useEffect(() => {
      if (!bloqueadoHasta) { setRestanteSeg(0); return; }
  
      const actualizar = () => {
        const seg = Math.max(0, Math.ceil((bloqueadoHasta - Date.now()) / 1000));
        setRestanteSeg(seg);
        if (seg <= 0) {
          // Expiró el bloqueo: se limpia y se vuelve a permitir el acceso.
          limpiarEstadoLogin();
          setBloqueadoHasta(null);
          setError('');
        }
      };
  
      actualizar();
      const id = setInterval(actualizar, 1000);
      return () => clearInterval(id);
    }, [bloqueadoHasta]);
  
    /* ── Al montar: si hay intentos previos registrados, se avisa al usuario ── */
    useEffect(() => {
      const { bloqueadoHasta: hasta, intentosRestantes } = leerEstadoLogin();
      if (hasta && hasta > Date.now()) return; // el bloqueo se muestra por la cuenta regresiva
      if (typeof intentosRestantes === 'number' && intentosRestantes < MAX_INTENTOS_LOGIN) {
        setError(`Te quedan ${intentosRestantes} intento(s) antes del bloqueo temporal.`);
      }
    }, []);
    /* ── Cargar imágenes del carrusel desde la BD ── */
  useEffect(() => {
    const cargar = async () => {
      try {
        const { data } = await axios.get(`${API_BASE}/api/carrusel`);
        if (data.ok && data.datos?.length > 0) {
          const imagenes = data.datos.map(img => ({
            nombre: img.titulo || '',
            logo: img.imagen_url.startsWith('http') ? img.imagen_url : `${API_BASE}${img.imagen_url}`,
            color: '#CC0000',
          }));

          setMarcas(imagenes);
          precargarCarrusel(imagenes);
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
    }, 3500);
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

  const handlePasswordChange = (e) => {
    const original = e.target.value;
    const limpio = sanitizarPassword(original).slice(0, MAX_PASSWORD);
    if (limpio !== original) {
      if (contieneEmoji(original)) setError('Los emojis no están permitidos.');
      else if (contieneHTML(original) || contienePatronSQL(original)) setError(MSG_NO_PERMITIDO);
      else setError('La contraseña contiene caracteres no permitidos.');
    } else {
      setError('');
    }
    setPassword(limpio);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Evita múltiples envíos por clics seguidos mientras una solicitud está en curso.
    if (enviandoRef.current || cargando) return;

    // Si el acceso está bloqueado, no se procesa (el backend también lo rechaza).
    if (bloqueado) {
      setError(`Acceso bloqueado. Intenta de nuevo en ${formatearTiempo(restanteSeg)}.`);
      return;
    }

    setError('');
    // ── Validaciones previas: evitan enviar campos vacíos o con solo espacios ──
    const usuarioLimpio = nombreUsuario.trim();
    if (!usuarioLimpio) {
      setError('Ingresa tu nombre de usuario (no puede contener solo espacios).');
      return;
    }
    if (!password.trim()) {
      setError('Ingresa tu contraseña (no puede contener solo espacios).');
      return;
    }
    if (usuarioLimpio.length > MAX_USUARIO) {
      setError('El nombre de usuario no puede exceder los 50 caracteres.');
      return;
    }
    if (password.length > MAX_PASSWORD) {
      setError('La contraseña no puede exceder los 64 caracteres.');
      return;
    }
    if (contieneHTML(usuarioLimpio) || contieneHTML(password)
        || contienePatronSQL(usuarioLimpio) || contienePatronSQL(password)) {
      setError(MSG_NO_PERMITIDO);
      return;
    }
    if (!USUARIO_PERMITIDO.test(usuarioLimpio)) {
      setError('El usuario solo admite letras, números y los símbolos . _ - @ (sin emojis).');
      return;
    }
    if (!PASSWORD_PERMITIDO.test(password)) {
      setError('La contraseña contiene caracteres no permitidos (no se admiten emojis).');
      return;
    }

    enviandoRef.current = true;
    setCargando(true);
    try {
      await iniciarSesion(usuarioLimpio, password);
      // Login correcto: se limpia cualquier registro de intentos/bloqueo.
      limpiarEstadoLogin();
      setBloqueadoHasta(null);
      toast.success('¡Bienvenido al sistema JYR!');
      navigate('/');
    } catch (err) {
      const datos = err.response?.data || {};

      // 429: bloqueo por exceso de intentos. Se persiste para sobrevivir al refresco.
      if (err.response?.status === 429) {
        const hasta = datos.bloqueadoHasta
          || (Date.now() + (datos.retryAfter || 600) * 1000);
        guardarEstadoLogin({ bloqueadoHasta: hasta });
        setBloqueadoHasta(hasta);
        setError(datos.mensaje || 'Acceso bloqueado temporalmente por demasiados intentos.');
        return;
      }

      // El backend puede responder el detalle en `mensaje` (auth) o `message` (validación).
      let msg = datos.mensaje
        || datos.message
        || 'No se pudo iniciar sesión. Verifica tus credenciales e inténtalo de nuevo.';

      // Se persiste el conteo para mostrarlo aunque se refresque la página.
      if (typeof datos.intentosRestantes === 'number') {
        guardarEstadoLogin({ intentosRestantes: datos.intentosRestantes });
        msg += ` Te quedan ${datos.intentosRestantes} intento(s) antes del bloqueo temporal.`;
      }
      setError(msg);
    } finally {
      setCargando(false);
      enviandoRef.current = false;
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
            <div key={`${marca.nombre}-${i}`}
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

        {bloqueado ? (
            <div className="alert alert-danger d-flex align-items-center" role="alert">
              <span>
                Acceso bloqueado por demasiados intentos fallidos.
                Podrás intentar de nuevo en <strong>{formatearTiempo(restanteSeg)}</strong>.
              </span>
            </div>
          ) : error && (
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
                  onChange={handleUsuarioChange}
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
                  onChange={handlePasswordChange}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="current-password"
                 maxLength={MAX_PASSWORD}
                 disabled={bloqueado} 
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
              {bloqueado
                ? `Bloqueado (${formatearTiempo(restanteSeg)})`
                : (cargando ? 'Ingresando...' : 'Ingresar')}
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
