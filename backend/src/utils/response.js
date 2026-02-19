// =====================================================
// UTIL: response
// Respuestas estándar para toda la API
// =====================================================

export const sendOk = (res, { status = 200, message = 'OK', data = null } = {}) => {
  return res.status(status).json({
    ok: true, // // Indica éxito
    message, // // Mensaje estándar
    data // // Datos (si aplica)
  });
};
