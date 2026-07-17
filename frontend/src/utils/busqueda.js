// ==========================================
// Saneamiento y limites para los CAMPOS DE BUSQUEDA del sistema.
// Objetivo: que ninguna entrada extrema (cadenas alfanumericas masivas,
// caracteres de control, intentos de inyeccion) provoque renders excesivos,
// consultas innecesarias o bloqueos del navegador.
// ==========================================
import { sanitizarTexto } from './sanitizarTexto.js';

// Longitud maxima aceptada por CUALQUIER buscador del sistema.
export const MAX_LEN_BUSQUEDA = 100;

// Caracteres de control invisibles (C0 U+0000-U+001F, DEL U+007F, C1 U+0080-U+009F).
// Incluye saltos de linea y tabulaciones que un pegado podria introducir.
// Se construye con new RegExp + escapes para no incrustar bytes de control.
const CONTROL_CHARS = new RegExp('[\\u0000-\\u001F\\u007F-\\u009F]', 'g');
const ESPACIOS_REPETIDOS = / {2,}/g;

// Sanitiza el texto de un buscador antes de guardarlo en el estado o enviarlo.
//  - Coacciona a string de forma segura (nunca lanza ante null/undefined/objetos).
//  - Reutiliza sanitizarTexto para quitar caracteres de inyeccion (< > / \).
//  - Elimina caracteres de control invisibles.
//  - Colapsa espacios repetidos para evitar terminos artificialmente largos.
//  - Recorta a un tope DURO de longitud como ultima barrera.
export const sanitizarBusqueda = (valor, max = MAX_LEN_BUSQUEDA) => {
  let texto;
  try {
    texto = valor == null ? '' : String(valor);
  } catch {
    // Objetos con toString malicioso o getters que lanzan -> termino vacio.
    return '';
  }
  const limite = Number.isFinite(max) && max > 0 ? Math.floor(max) : MAX_LEN_BUSQUEDA;
  return sanitizarTexto(texto)
    .replace(CONTROL_CHARS, '')
    .replace(ESPACIOS_REPETIDOS, ' ')
    .slice(0, limite);
};

// True cuando el termino ya alcanzo (o supero) el tope permitido.
// Util para dar retroalimentacion clara al usuario sobre la restriccion.
export const enLimiteBusqueda = (valor, max = MAX_LEN_BUSQUEDA) => {
  const limite = Number.isFinite(max) && max > 0 ? Math.floor(max) : MAX_LEN_BUSQUEDA;
  return typeof valor === 'string' && valor.length >= limite;
};
