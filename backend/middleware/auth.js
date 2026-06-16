import { verifyAuthToken } from '../services/authService.js';
import { normalizeSystemRole } from '../services/roleService.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const payload = verifyAuthToken(token);
    req.auth = {
      ...payload,
      systemRole: normalizeSystemRole(payload.systemRole),
    };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = verifyAuthToken(token);
      req.auth = {
        ...payload,
        systemRole: normalizeSystemRole(payload.systemRole),
      };
    } catch {
      req.auth = null;
    }
  }
  next();
}

export function requireRoles(...roles) {
  const allowed = new Set(roles.map(normalizeSystemRole));
  return (req, res, next) => {
    if (!req.auth) return res.status(401).json({ error: 'Not authenticated' });
    if (!allowed.has(req.auth.systemRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
