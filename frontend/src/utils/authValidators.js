// Reglas de validación compartidas para los campos de autenticación.
// Se usan tanto en el login como en la recuperación de contraseña.

export const MAX_USUARIO = 50;
export const MAX_PASSWORD = 64;

// Conjuntos permitidos (bloquean emojis, caracteres no controlados y
// símbolos típicos de inyección SQL: comillas ' " ` , plecas | , punto y
// coma ; y barra invertida \ ).
// Usuario: letras (con tildes y ñ), números y separadores comunes . _ - @
export const USUARIO_PERMITIDO = /^[A-Za-z0-9ñÑáéíóúÁÉÍÓÚüÜ._@-]+$/;
// Contraseña: letras, números, espacios y símbolos de teclado seguros
// (sin comillas, plecas, punto y coma, backtick, barra invertida ni < > ).
export const PASSWORD_PERMITIDO = /^[A-Za-z0-9ñÑáéíóúÁÉÍÓÚüÜ !@#$%^&*()_+\-=[\]{}:,./?~]+$/;

// Versiones "negadas" para depurar en cada tecla lo que NO está permitido.
const USUARIO_INVALIDO = /[^A-Za-z0-9ñÑáéíóúÁÉÍÓÚüÜ._@-]/g;
const PASSWORD_INVALIDO = /[^A-Za-z0-9ñÑáéíóúÁÉÍÓÚüÜ !@#$%^&*()_+\-=[\]{}:,./?~]/g;

// Símbolos y secuencias típicas de inyección SQL. Se usa como validación
// adicional en el envío (cubre secuencias como -- , /* , */ que no se
// detectan carácter a carácter).
export const PATRON_SQL = /['"`;|\\]|--|\/\*|\*\//;
export const contienePatronSQL = (texto = '') => PATRON_SQL.test(texto);

// Detecta etiquetas HTML o corchetes angulares (prevención de XSS por
// inyección pasiva de <script>, <img onerror=...>, etc.).
export const contieneHTML = (texto = '') => /[<>]/.test(texto);

// Neutraliza cualquier etiqueta/corchete angular convirtiéndolo en entidad
// segura. Refuerza el escape automático que React ya aplica a la salida.
export const escaparHTML = (texto = '') =>
  String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// Detecta emojis / símbolos pictográficos (banderas, variaciones, etc.).
export const contieneEmoji = (texto = '') =>
  /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{200D}\u{FE0F}]/u.test(texto);

// Elimina los caracteres no permitidos conforme el usuario escribe/pega.
export const sanitizarUsuario = (texto = '') => texto.replace(USUARIO_INVALIDO, '');
export const sanitizarPassword = (texto = '') => texto.replace(PASSWORD_INVALIDO, '');
