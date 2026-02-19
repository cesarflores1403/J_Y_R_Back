import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { toast } from 'react-toastify';
import { FiUser, FiLock, FiLogIn } from 'react-icons/fi';

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
      <div className="jyr-login-left">
        <div className="login-brand">
          <div className="login-logo">JYR</div>
          <h1>COMPAÑÍA JYR</h1>
          <p>Sistema de Inventario y Facturación</p>
        </div>
      </div>

      <div className="jyr-login-right">
        <div className="login-form-wrapper">
          <h2>Iniciar Sesión</h2>
          <p className="login-subtitle">Ingresa tus credenciales para acceder</p>

          {error && (
            <div className="alert alert-danger d-flex align-items-center" role="alert">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Usuario</label>
              <div className="input-group">
                <span className="input-group-text"><FiUser /></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nombre de usuario"
                  value={nombreUsuario}
                  onChange={(e) => setNombreUsuario(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label">Contraseña</label>
              <div className="input-group">
                <span className="input-group-text"><FiLock /></span>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-100 jyr-btn-primary" disabled={cargando}>
              {cargando ? (
                <span className="spinner-border spinner-border-sm me-2" />
              ) : (
                <FiLogIn className="me-2" />
              )}
              {cargando ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
