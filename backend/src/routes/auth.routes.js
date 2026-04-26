import { Router } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AUTH_MODE, requireAuth } from '../middleware/auth.middleware.js';
import {
  generateTokens,
  setAuthCookies,
  clearAuthCookies,
  loginWithPassword,
  generateOidcAuthUrl,
  handleOidcCallback,
  findOrCreateOidcUser,
} from '../services/auth.service.js';
import { basePrisma } from '../middleware/tenant.middleware.js';

const router = Router();

router.get('/config', (req, res) => {
  res.json({ mode: AUTH_MODE });
});

// Local mode
router.post('/login', async (req, res, next) => {
  if (AUTH_MODE !== 'local') {
    return res.status(404).json({ error: 'Local login not available', code: 'WRONG_AUTH_MODE' });
  }
  try {
    const { email, password } = z.object({
      email: z.string().email(),
      password: z.string().min(1),
    }).parse(req.body);

    const user = await loginWithPassword(email, password);
    const tokens = generateTokens(user);
    setAuthCookies(res, tokens);
    res.json({
      user: { id: user.id, email: user.email, name: user.name, roles: user.roles, tenantId: user.tenantId },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const token = req.cookies?.reflections_rt;
    if (!token) return res.status(401).json({ error: 'No refresh token', code: 'NO_TOKEN' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.type !== 'refresh') throw new Error('Invalid token type');

    const user = await basePrisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or inactive', code: 'INVALID_USER' });
    }

    const tokens = generateTokens(user);
    setAuthCookies(res, tokens);
    res.json({ ok: true });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token', code: 'INVALID_TOKEN' });
  }
});

router.post('/logout', (req, res) => {
  clearAuthCookies(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await basePrisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, email: true, name: true, roles: true, tenantId: true, isActive: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found', code: 'NOT_FOUND' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// OIDC mode
const oidcSessions = new Map();

router.get('/oidc/login', async (req, res, next) => {
  if (AUTH_MODE !== 'oidc') {
    return res.status(404).json({ error: 'OIDC not configured', code: 'WRONG_AUTH_MODE' });
  }
  try {
    const state = crypto.randomBytes(16).toString('hex');
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    oidcSessions.set(state, { codeVerifier, createdAt: Date.now() });

    const authUrl = await generateOidcAuthUrl(state, codeVerifier);
    res.redirect(authUrl.toString());
  } catch (err) {
    next(err);
  }
});

router.get('/oidc/callback', async (req, res, next) => {
  if (AUTH_MODE !== 'oidc') {
    return res.status(404).json({ error: 'OIDC not configured', code: 'WRONG_AUTH_MODE' });
  }
  try {
    const { state } = req.query;
    const session = oidcSessions.get(state);
    if (!session) return res.status(400).json({ error: 'Invalid state', code: 'INVALID_STATE' });
    oidcSessions.delete(state);

    const callbackUrl = `${process.env.OAUTH2_REDIRECT_URI}?${new URLSearchParams(req.query)}`;
    const claims = await handleOidcCallback(callbackUrl, state, session.codeVerifier);

    // Use the first non-system tenant or let user pick — here we default to first active tenant
    const tenants = await basePrisma.tenant.findMany({ where: { slug: { not: 'system' } } });
    if (!tenants.length) throw new Error('No tenant available for OIDC login');

    const user = await findOrCreateOidcUser(tenants[0].id, claims);
    const tokens = generateTokens(user);
    setAuthCookies(res, tokens);
    res.redirect(process.env.FRONTEND_URL || '/');
  } catch (err) {
    next(err);
  }
});

export default router;
