const crypto = require('crypto');
//no use csurf. se usa x-csrf-token 
function ensureToken(req) {
  if (!req.session) return null;
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  return req.session.csrfToken;
}

// GET /api/csrf-token, se implementa cookie con sameSite strict
function getCsrfToken(req, res) {
  const token = ensureToken(req);
  if (!token) {
    return res.status(500).json({ error: 'CSRF token unavailable' });
  }
  // Configurar cookie para frontend: sameSite: strict(reduce envio automatico de cookies en contexto de terceros)
  res.cookie('csrfToken', token, { sameSite: 'strict', httpOnly: false });
  return res.json({ csrfToken: token });
}

function csrfProtection(req, res, next) {
  const token = req.get('x-csrf-token') || req.body?._csrf;
  const sessionToken = req.session?.csrfToken;
  if (!sessionToken || !token || token !== sessionToken) {
    return res.status(403).json({ error: 'CSRF token missing or invalid' });
  }
  next();
}
//validaCION de origen
function originCheck(req, res, next) {
  const allowedOrigins = ['http://localhost:3000'];
  const origin = req.get('origin') || req.get('referer') || '';
  if (origin && !allowedOrigins.some(ao => origin.startsWith(ao))) {
    return res.status(403).json({ error: 'Invalid Origin' });
  }
  next();
}

module.exports = { getCsrfToken, csrfProtection, originCheck };
