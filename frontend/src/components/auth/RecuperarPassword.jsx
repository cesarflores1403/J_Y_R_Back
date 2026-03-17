import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FiMail, FiArrowLeft } from 'react-icons/fi';
import logoFull from '../../assets/img/logo1.jpeg';
import { authService } from '../../services/serviceIndex.js';

const RecuperarPassword = () => {
  const [correo, setCorreo]   = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado]   = useState(false);
  const navigate = useNavigate();

  const handleEnviar = async (e) => {
    e.preventDefault();
    if (!correo.trim()) return;
    setEnviando(true);

    try {
      await authService.solicitarRecuperacion({ correo: correo.trim() });
      setEnviando(false);
      setEnviado(true);
      toast.success('En estos momentos le notificamos al administrador que solicitó el cambio de contraseña');
    } catch (error) {
      setEnviando(false);
      toast.error(error.response?.data?.mensaje || 'No se pudo enviar la solicitud');
    }
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
                ? 'Ingresa tu correo para notificar al administrador sobre tu solicitud de cambio de contraseña'
                : 'Solicitud enviada al administrador'}
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
                {enviando ? 'Enviando...' : 'Enviar solicitud'}
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
              <h5 className="fw-semibold mb-2">¡Solicitud enviada!</h5>
              <p className="text-muted mb-4">
                En estos momentos le notificamos al administrador<br />
                que solicitaste el cambio de contraseña para <strong>{correo}</strong>.
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
