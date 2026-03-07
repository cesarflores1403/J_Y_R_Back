import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiArrowLeft } from 'react-icons/fi';
import logoFull from '../../assets/img/logo1.jpeg';

const RecuperarPassword = () => {
  const [correo, setCorreo]   = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado]   = useState(false);
  const navigate = useNavigate();

  const handleEnviar = (e) => {
    e.preventDefault();
    if (!correo.trim()) return;
    setEnviando(true);
    // Aquí se conectará el backend
    setTimeout(() => {
      setEnviando(false);
      setEnviado(true);
    }, 1200);
  };

  return (
    <div className="login-split">
      {/* Lado izquierdo decorativo */}
      <div className="login-carousel-side">
        <div className="login-carousel-bg" />
        <div className="login-carousel-footer">
          <p>Recupera el acceso a tu cuenta</p>
        </div>
      </div>

      {/* Formulario */}
      <div className="login-form-side">
        <div className="login-form-wrapper">
          <div className="text-center mb-4">
            <img src={logoFull} alt="J&R" className="login-form-logo" />
            <h2 className="login-title">Recuperar contraseña</h2>
            <p className="login-subtitle">
              {!enviado
                ? 'Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña'
                : 'Revisa tu bandeja de entrada'}
            </p>
          </div>

          {!enviado ? (
            <form onSubmit={handleEnviar}>
              <div className="mb-4">
                <label className="form-label login-label">Correo electrónico</label>
                <div className="input-group">
                  <span className="input-group-text login-input-icon"><FiMail /></span>
                  <input
                    type="email"
                    className="form-control login-input"
                    placeholder="correo@ejemplo.com"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button type="submit" className="btn w-100 login-btn mb-3" disabled={enviando}>
                {enviando
                  ? <span className="spinner-border spinner-border-sm me-2" />
                  : null}
                {enviando ? 'Enviando...' : 'Enviar enlace'}
              </button>

              <button type="button"
                className="btn w-100 btn-outline-secondary"
                onClick={() => navigate('/login')}>
                <FiArrowLeft className="me-2" />
                Volver al inicio de sesión
              </button>
            </form>
          ) : (
            <div className="text-center">
              <div className="mb-3" style={{ fontSize: '3rem' }}>📧</div>
              <h5 className="fw-semibold mb-2">¡Correo enviado!</h5>
              <p className="text-muted mb-4">
                Hemos enviado un enlace a <strong>{correo}</strong>.<br />
                Sigue las instrucciones para restablecer tu contraseña.
              </p>
              <button className="btn w-100 login-btn"
                onClick={() => navigate('/login')}>
                <FiArrowLeft className="me-2" />
                Volver al inicio de sesión
              </button>
            </div>
          )}

          <div className="text-center mt-4">
            <small className="login-footer-text">J & R Accesorios & Reparaciones</small>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecuperarPassword;
