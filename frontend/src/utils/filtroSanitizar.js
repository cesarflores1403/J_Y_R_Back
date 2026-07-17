// ==========================================
// Saneamiento + retroalimentación para FILTROS DE BÚSQUEDA.
// Elimina caracteres potencialmente peligrosos (inyección: < > / \) de la
// entrada y AVISA al usuario cuando se ignoraron caracteres no permitidos,
// evitando dejarlo sin feedback. Complementa la validación del backend.
// ==========================================
import { toast } from 'react-toastify';
import { sanitizarTexto } from './sanitizarTexto.js';

// Sanea el valor de un filtro de texto y, si se removieron caracteres no
// permitidos, muestra una alerta (con toastId único para no apilar mensajes).
export const sanitizarFiltro = (valor, maxLen = 100) => {
  const bruto = String(valor ?? '');
  const sinPeligrosos = sanitizarTexto(bruto);

  // Aviso SOLO cuando se removieron caracteres no permitidos (no por recorte).
  if (sinPeligrosos.length < bruto.length) {
    toast.warn('Se ignoraron caracteres no permitidos en la búsqueda (< > / \\).', {
      toastId: 'filtro-caracteres-invalidos',
      autoClose: 2500
    });
  }

  return Number.isFinite(maxLen) && maxLen > 0
    ? sinPeligrosos.slice(0, maxLen)
    : sinPeligrosos;
};
