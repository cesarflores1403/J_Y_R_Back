// ==========================================
// Saneamiento de ENTEROS para campos numéricos (cantidad, stock, ids).
// Evita que cadenas numéricas excesivas desborden visualmente la caja de texto
// y que lleguen valores fuera de rango al backend. Devuelve SIEMPRE un string
// (o '' cuando está vacío) para usarse directamente como value controlado.
// ==========================================

// Tope general para cantidades y stock (6 dígitos: hasta 999,999).
export const MAX_CANTIDAD = 999999;

// Deja solo dígitos y acota el valor a [0, max]. Cadena vacía -> ''.
export const sanitizarEntero = (valor, max = MAX_CANTIDAD) => {
  const soloDigitos = String(valor ?? '').replace(/\D/g, '');
  if (soloDigitos === '') return '';
  const n = Number.parseInt(soloDigitos, 10);
  if (!Number.isFinite(n)) return '';
  const tope = Number.isFinite(max) && max > 0 ? max : MAX_CANTIDAD;
  return String(Math.min(tope, n));
};

// Cantidad de dígitos necesarios para representar un tope (para maxLength).
export const digitosDe = (max = MAX_CANTIDAD) => String(Math.max(0, Math.floor(max))).length;
