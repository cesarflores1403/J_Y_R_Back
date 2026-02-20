import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { toast } from 'react-toastify';
import { FiUser, FiLock, FiLogIn } from 'react-icons/fi';
import logoFull from '../../assets/img/logo1.jpeg';
import logoClean from '../../assets/img/logo2.jpeg';

const Login = () => {
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const { iniciarSesion } = useAuth();
  const navigate = useNavigate();

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
    <div className="jyr-login-container">
      {/* Marca de agua — logo texto */}
      <img src={logoClean} alt="" className="login-watermark" aria-hidden="true" />

      {/* Formulario centrado */}
      <div className="login-center-card">
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
  );
};

export default Login;
