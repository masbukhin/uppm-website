import crypto from 'node:crypto';

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
const HASH_PREFIX = 'scrypt$';
const COOKIE_NAME = 'uppm_session';
const SESSION_TTL_SECONDS = 12 * 60 * 60;

export const MIN_PASSWORD_LENGTH = 8;

// ---------- Password hashing ----------

export function isPasswordHash(value) {
  return typeof value === 'string' && value.startsWith(HASH_PREFIX);
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return `${HASH_PREFIX}${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function verifyPassword(password, stored) {
  if (!isPasswordHash(stored)) return false;
  const [, n, r, p, saltB64, hashB64] = stored.split('$');
  const expected = Buffer.from(hashB64, 'base64');
  const actual = crypto.scryptSync(String(password), Buffer.from(saltB64, 'base64'), expected.length, {
    N: Number(n), r: Number(r), p: Number(p),
  });
  return crypto.timingSafeEqual(actual, expected);
}

/** Unusable hash for disabled accounts (e.g. leaked demo credentials). */
export function disabledPasswordHash() {
  return hashPassword(crypto.randomBytes(32).toString('hex'));
}

export function validateNewPassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Password minimal ${MIN_PASSWORD_LENGTH} karakter.`;
  }
  if (password.length > 200) return 'Password terlalu panjang.';
  return '';
}

// ---------- Signed session cookie ----------

let sessionSecret;

export function initSessionSecret() {
  const configured = process.env.SESSION_SECRET;
  if (configured && configured.length >= 32) {
    sessionSecret = configured;
    return;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET wajib diisi (minimal 32 karakter) di production.');
  }
  sessionSecret = crypto.randomBytes(32).toString('hex');
  console.warn('SESSION_SECRET belum diisi: memakai secret acak, semua sesi hilang saat server restart.');
}

function sign(value) {
  return crypto.createHmac('sha256', sessionSecret).update(value).digest('base64url');
}

/** Short fingerprint of the password hash: changing the password invalidates old sessions. */
export function passwordVersion(passwordHash) {
  return crypto.createHash('sha256').update(String(passwordHash)).digest('base64url').slice(0, 16);
}

export function createSessionToken(account) {
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({
    sub: account.id,
    role: account.role,
    pv: passwordVersion(account.password),
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  })).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function readSessionToken(token) {
  if (typeof token !== 'string' || !token.includes('.')) return null;
  const [body, signature] = token.split('.');
  const expected = sign(body);
  if (signature.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const session = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!session.sub || Number(session.exp) < Date.now() / 1000) return null;
    return session;
  } catch {
    return null;
  }
}

export function readCookie(request, name = COOKIE_NAME) {
  const header = request.headers.cookie || '';
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) return decodeURIComponent(part.slice(index + 1).trim());
  }
  return '';
}

function cookieSecure(request) {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;
  return Boolean(request.secure);
}

export function setSessionCookie(request, response, token) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (cookieSecure(request)) parts.push('Secure');
  response.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(request, response) {
  const parts = [`${COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (cookieSecure(request)) parts.push('Secure');
  response.setHeader('Set-Cookie', parts.join('; '));
}

// ---------- Login rate limit (in-memory, per IP and per username) ----------

const FAILURE_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;
const failures = new Map();

function failureKeys(ip, username) {
  return [`ip:${ip}`, `user:${String(username || '').toLowerCase()}`];
}

export function isLoginBlocked(ip, username) {
  const now = Date.now();
  return failureKeys(ip, username).some(key => {
    const entry = failures.get(key);
    if (!entry) return false;
    if (now - entry.first > FAILURE_WINDOW_MS) {
      failures.delete(key);
      return false;
    }
    return entry.count >= MAX_FAILURES;
  });
}

export function recordLoginFailure(ip, username) {
  const now = Date.now();
  for (const key of failureKeys(ip, username)) {
    const entry = failures.get(key);
    if (!entry || now - entry.first > FAILURE_WINDOW_MS) failures.set(key, { first: now, count: 1 });
    else entry.count += 1;
  }
}

export function clearLoginFailures(ip, username) {
  for (const key of failureKeys(ip, username)) failures.delete(key);
}

/** Account data that is safe to send to the browser. */
export function publicAccount(account) {
  if (!account) return null;
  const { password: _password, ...rest } = account;
  return rest;
}
