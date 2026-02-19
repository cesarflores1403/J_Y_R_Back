// =====================================================
// MIDDLEWARE: notFound
// Responde cuando no existe la ruta solicitada
// =====================================================
export const notFound = (req, res, next) => {
  res.status(404).json({
    ok: false, // // Indica fallo
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`, // // Info útil
  }); // // Respuesta estándar
};
