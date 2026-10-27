import jwt from 'jsonwebtoken';

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'bookleaf-secret-key-2026-secure-token')) {
  console.error('[FATAL] A dedicated, strong JWT_SECRET environment variable is mandatory in production.');
  process.exit(1);
}

export const JWT_SECRET = process.env.JWT_SECRET || 'bookleaf-secret-key-2026-secure-token';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({
        error: `Access denied. Requires '${role}' privilege, but you are logged in as '${req.user.role}'.`
      });
    }
    next();
  };
}
