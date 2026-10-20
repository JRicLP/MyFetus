const jwt = require('jsonwebtoken'); 
const logger = require('../utils/logger');

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não informado' });
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Formato de token inválido' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    logger.warn('Falha de autenticação', { code: 'AUTH_TOKEN_INVALID', reason: err.name });
return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

function requireRole(...allowedRoles) {
  const middleware = (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    next();
  };

  // Exposto para o verificador do contrato OpenAPI comparar os papeis documentados.
  middleware.allowedRoles = Object.freeze([...allowedRoles]);
  return middleware;
}

module.exports = {
  authenticateToken,
  requireRole
};