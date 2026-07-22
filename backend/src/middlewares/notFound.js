// =====================================================
// MIDDLEWARE: notFound
// Responde cuando no existe la ruta solicitada
// =====================================================
export const notFound = (req, res, next) => {
  res.status(404).json({
    ok: false,
    mensaje: 'Recurso no encontrado',
  });
};
