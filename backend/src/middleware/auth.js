// Middleware de autenticación
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  // Aquí iría la verificación del token JWT
  // const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // req.user = decoded;

  next();
};

module.exports = {
  authenticateToken
};
