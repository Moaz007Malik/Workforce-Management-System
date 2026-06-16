import { verifyAuthToken } from '../services/authService.js';

/** Attaches req.auth when a valid Bearer token is present (does not block). */
export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    req.auth = verifyAuthToken(token);
  } catch {
    req.auth = null;
  }
  next();
}
