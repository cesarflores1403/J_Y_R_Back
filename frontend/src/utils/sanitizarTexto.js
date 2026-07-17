// Sanitización estricta anti-XSS en el frontend.
// Elimina en el momento de escribir los caracteres usados para inyectar
// etiquetas/scripts (<, >, /, \), de modo que nunca lleguen al estado ni al
// backend. Complementa la sanitización del servidor (defensa en profundidad).
export const sanitizarTexto = (valor = '') => String(valor).replace(/[<>/\\]/g, '');
