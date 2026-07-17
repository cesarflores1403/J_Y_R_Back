// Sanitización estricta de texto para prevenir XSS (Cross-Site Scripting).
// Elimina los caracteres usados para inyectar etiquetas/scripts (<, >, /, \)
// además de recortar y colapsar espacios. Se aplica en el backend antes de
// procesar/almacenar cualquier dato de texto, como defensa en profundidad
// frente a llamadas directas a la API.
export const sanitizarTexto = (valor) => {
  if (valor === undefined || valor === null) return '';
  return String(valor)
    .replace(/[<>/\\]/g, '')   // caracteres para formar etiquetas HTML / cierres de script
    .replace(/\s{2,}/g, ' ')   // colapsa espacios repetidos
    .trim();
};

// Variante para filtros opcionales: devuelve null si el resultado queda vacío.
export const sanitizarTextoOpcional = (valor) => {
  const limpio = sanitizarTexto(valor);
  return limpio.length > 0 ? limpio : null;
};
