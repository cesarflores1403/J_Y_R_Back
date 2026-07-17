import React from 'react';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

/**
 * ErrorBoundary — "escudo de errores".
 *
 * Captura cualquier excepción que ocurra al renderizar sus componentes hijos
 * (datos inválidos, cálculos corruptos, valores NaN/Infinity, etc.) y, en lugar
 * de dejar que React desmonte toda la pantalla (lo que congela la interfaz y
 * hace desaparecer componentes como el buscador dinámico), muestra una
 * advertencia controlada con opción de reintentar.
 *
 * Uso:
 *   <ErrorBoundary titulo="Módulo de Cotizaciones">
 *     <Cotizaciones />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hayError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Actualiza el estado para mostrar la UI de respaldo en el próximo render.
    return { hayError: true, error };
  }

  componentDidCatch(error, info) {
    // El detalle técnico queda solo en la consola / logs, no en pantalla.
    console.error('[ErrorBoundary] Error capturado en la interfaz:', error, info);
  }

  reintentar = () => {
    this.setState({ hayError: false, error: null });
  };

  render() {
    if (this.state.hayError) {
      return (
        <div className="container py-4">
          <div className="jyr-card">
            <div className="jyr-card-body text-center py-5">
              <FiAlertTriangle size={44} className="text-warning mb-3" />
              <h4 className="mb-2">Se detectó un problema en la pantalla</h4>
              <p className="text-muted mb-4" style={{ maxWidth: 480, margin: '0 auto' }}>
                {this.props.titulo ? `${this.props.titulo}: ` : ''}
                ocurrió un error al procesar los datos. La aplicación evitó que la
                pantalla se congelara. Puedes reintentar; si el problema persiste,
                revisa los datos ingresados.
              </p>
              <button className="btn jyr-btn-primary" onClick={this.reintentar}>
                <FiRefreshCw className="me-2" />Reintentar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
