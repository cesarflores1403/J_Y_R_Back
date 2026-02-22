// =====================================================
// MIDDLEWARE: errorHandler
// Maneja errores en un solo lugar (respuesta uniforme)
// =====================================================
export const errorHandler = (err, req, res, next) => {
  console.error('❌ Error capturado:', err);

  // =====================================================
  // Errores de PostgreSQL (raw SQL / pool.query)
  // =====================================================

  // 23505 = unique_violation (PK o UNIQUE constraint)
  if (err.code === '23505') {
    const campo = err.constraint || 'campo';
    return res.status(409).json({
      ok: false,
      message: `Ya existe un registro con ese valor. Restricción: ${campo}`,
      data: null
    });
  }

  // 23503 = foreign_key_violation
  if (err.code === '23503') {
    return res.status(400).json({
      ok: false,
      message: 'Error de referencia: el registro relacionado no existe en la base de datos.',
      data: null
    });
  }

  // 23502 = not_null_violation
  if (err.code === '23502') {
    return res.status(400).json({
      ok: false,
      message: `El campo "${err.column || 'requerido'}" no puede estar vacío.`,
      data: null
    });
  }

  // =====================================================
  // Errores de Sequelize
  // =====================================================
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      ok: false,
      message: 'Error de validación',
      data: null,
      errores: err.errors.map(e => ({ campo: e.path, mensaje: e.message }))
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      ok: false,
      message: 'Registro duplicado',
      data: null,
      errores: err.errors.map(e => ({ campo: e.path, mensaje: e.message }))
    });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      ok: false,
      message: 'Error de referencia: el registro relacionado no existe',
      data: null
    });
  }

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(status).json({
    ok: false,
    message,
    data: null,
  });
};
