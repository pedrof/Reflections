import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import * as openidClient from 'openid-client';
import { basePrisma } from '../middleware/tenant.middleware.js';

export function generateTokens(user) {
  const payload = {
    userId: user.id,
    tenantId: user.tenantId,
    roles: user.roles,
    email: user.email,
    name: user.name,
  };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
  });
  const refreshToken = jwt.sign(
    { userId: user.id, tenantId: user.tenantId, type: 'refresh' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
  return { accessToken, refreshToken };
}

export function setAuthCookies(res, { accessToken, refreshToken }) {
  const secure = process.env.NODE_ENV === 'production';
  res.cookie('reflections_at', accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('reflections_rt', refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res) {
  res.clearCookie('reflections_at');
  res.clearCookie('reflections_rt');
}

export async function loginWithPassword(email, password) {
  const user = await basePrisma.user.findFirst({
    where: { email, isActive: true },
    include: { tenant: true },
  });
  if (!user || !user.hashedPassword) {
    throw Object.assign(new Error('Invalid credentials'), { code: 'INVALID_CREDENTIALS', status: 401 });
  }
  const valid = await bcrypt.compare(password, user.hashedPassword);
  if (!valid) {
    throw Object.assign(new Error('Invalid credentials'), { code: 'INVALID_CREDENTIALS', status: 401 });
  }
  return user;
}

// OIDC support
let _oidcConfig = null;

export async function getOidcConfig() {
  if (_oidcConfig) return _oidcConfig;
  _oidcConfig = await openidClient.discovery(
    new URL(process.env.OAUTH2_ISSUER_URL),
    process.env.OAUTH2_CLIENT_ID,
    process.env.OAUTH2_CLIENT_SECRET
  );
  return _oidcConfig;
}

export async function generateOidcAuthUrl(state, codeVerifier) {
  const config = await getOidcConfig();
  const codeChallenge = await openidClient.calculatePKCECodeChallenge(codeVerifier);
  const params = new URLSearchParams({
    redirect_uri: process.env.OAUTH2_REDIRECT_URI,
    scope: 'openid email profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return openidClient.buildAuthorizationUrl(config, params);
}

export async function handleOidcCallback(callbackUrl, expectedState, codeVerifier) {
  const config = await getOidcConfig();
  const tokens = await openidClient.authorizationCodeGrant(config, new URL(callbackUrl), {
    pkceCodeVerifier: codeVerifier,
    expectedState,
  });
  const claims = tokens.claims();
  return {
    sub: claims.sub,
    email: claims.email,
    name: claims.name || claims.preferred_username || claims.email,
  };
}

export async function findOrCreateOidcUser(tenantId, { sub, email, name }) {
  let user = await basePrisma.user.findFirst({
    where: { tenantId, externalId: sub },
  });
  if (!user) {
    user = await basePrisma.user.upsert({
      where: { tenantId_email: { tenantId, email } },
      update: { externalId: sub, isActive: true },
      create: {
        tenantId,
        email,
        name,
        externalId: sub,
        roles: ['employee'],
      },
    });
  }
  return user;
}
