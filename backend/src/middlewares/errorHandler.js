// =====================================================
// MIDDLEWARE: errorHandler
// Maneja errores en un solo lugar (respuesta uniforme)
// =====================================================
export const errorHandler = (err, req, res, next) => {
  console.error('❌ Error capturado:', err); // // Log del error en consola

  const status = err.status || 500; // // Si el error trae status, úsalo; si no, 500
  const message = err.message || 'Error interno del servidor'; // // Mensaje seguro

  res.status(status).json({
    ok: false, // // Indica fallo
    message, // // Mensaje del error
  }); // // Respuesta estándar
};
