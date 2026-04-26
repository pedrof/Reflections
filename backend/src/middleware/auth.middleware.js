import jwt from 'jsonwebtoken';

export const AUTH_MODE = (
  process.env.OAUTH2_CLIENT_ID && process.env.OAUTH2_ISSUER_URL
) ? 'oidc' : 'local';

export function requireAuth(req, res, next) {
  const token = req.cookies?.reflections_at;
  if (!token) return res.status(401).json({ error: 'Unauthorized', code: 'NO_TOKEN' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized', code: 'INVALID_TOKEN' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized', code: 'NO_TOKEN' });
    const hasRole = roles.some((r) => req.user.roles.includes(r));
    if (!hasRole) return res.status(403).json({ error: 'Forbidden', code: 'INSUFFICIENT_ROLE' });
    next();
  };
}

export const requireSuperAdmin = requireRole('super_admin');
export const requireSupervisor = requireRole('supervisor', 'super_admin');
export const requireComms = requireRole('comms', 'supervisor', 'super_admin');
