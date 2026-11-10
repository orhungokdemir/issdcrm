import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { database, findRecord, listRecords, upsertRecord } from './db';

export interface AuthUser {
  id: string;
  fullName: string;
  username?: string;
  email: string;
  duty: string;
  phone: string;
  role: string;
  companies: string[];
  status: string;
  avatar?: string;
  mustChangePassword?: boolean;
  permissions?: string[];
}

function toPublicUser(user: Record<string, unknown>): AuthUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser as unknown as AuthUser;
}

export function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(password, salt, 64, { N: 16_384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt.toString('hex')}$${derivedKey.toString('hex')}`;
}

function verifyPassword(password: string, storedHash: unknown) {
  if (typeof storedHash !== 'string') return false;

  if (storedHash.startsWith('scrypt$')) {
    const [algorithm, cost, blockSize, parallelization, saltHex, keyHex] = storedHash.split('$');
    if (algorithm !== 'scrypt' || cost !== '16384' || blockSize !== '8' || parallelization !== '1') return false;
    if (!/^[0-9a-f]{32}$/i.test(saltHex || '') || !/^[0-9a-f]{128}$/i.test(keyHex || '')) return false;
    const expectedKey = Buffer.from(keyHex, 'hex');
    const actualKey = scryptSync(password, Buffer.from(saltHex, 'hex'), expectedKey.length, { N: 16_384, r: 8, p: 1 });
    return timingSafeEqual(actualKey, expectedKey);
  }

  if (!/^[0-9a-f]{64}$/i.test(storedHash)) return false;
  const expectedLegacyHash = Buffer.from(storedHash, 'hex');
  const actualLegacyHash = createHash('sha256').update(password, 'utf8').digest();
  return timingSafeEqual(actualLegacyHash, expectedLegacyHash);
}

export function authenticateUser(identifier: string, password: string) {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const user = findRecord('users', findUserIdByIdentifier(normalizedIdentifier) || '');
  if (!user || user.status !== 'Aktif' || !verifyPassword(password, user.passwordHash)) return null;
  if (typeof user.passwordHash === 'string' && !user.passwordHash.startsWith('scrypt$')) {
    const upgradedUser = { ...user, passwordHash: hashPassword(password) };
    upsertRecord('users', String(user.id), upgradedUser);
    return upgradedUser as Record<string, unknown>;
  }
  return user as Record<string, unknown>;
}

export function findUserByEmail(email: string) {
  const user = listRecords('users').find((candidate) => candidate.email?.toLowerCase() === email.trim().toLowerCase());
  return user as Record<string, unknown> | undefined;
}

function findUserIdByIdentifier(identifier: string) {
  const emailIdentifier = identifier.includes('@') ? identifier : `${identifier}@issd.com.tr`;
  const user = listRecords('users').find((candidate) => candidate.email?.toLowerCase() === emailIdentifier || candidate.username?.toLowerCase() === identifier);
  return user?.id as string | undefined;
}

function usernamePart(value: string) {
  return value.toLocaleLowerCase('tr-TR')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}

export function normalizeFullName(value: string) {
  return value.trim().toLocaleLowerCase('tr-TR').split(/\s+/).filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase('tr-TR') + part.slice(1)).join(' ');
}

export function createUniqueUsername(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const base = `${usernamePart(parts[0] || 'kullanici')}.${usernamePart(parts.slice(1).join(' ') || 'issd')}` || 'kullanici.issd';
  let username = base;
  let suffix = 2;
  while (listRecords('users').some((user) => user.username?.toLowerCase() === username.toLowerCase())) {
    username = `${base}${suffix}`;
    suffix += 1;
  }
  return username;
}

export function publicUser(user: Record<string, unknown>) {
  return toPublicUser(user);
}

export function createSession(userId: string, rememberMe = false) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * (rememberMe ? 24 * 30 : 8)).toISOString();
  database.prepare(`
    INSERT INTO sessions (token, user_id, expires_at)
    VALUES (?, ?, ?)
  `).run(token, userId, expiresAt);
  return { token, expiresAt };
}

export function getUserForToken(token: string) {
  const session = database.prepare(
    'SELECT user_id, expires_at FROM sessions WHERE token = ?'
  ).get(token) as { user_id: string; expires_at: string } | undefined;
  if (!session || new Date(session.expires_at) <= new Date()) return null;
  const user = findRecord('users', session.user_id);
  return user ? user as Record<string, unknown> : null;
}

export function deleteSession(token: string) {
  database.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export type AuthChallengePurpose = 'register' | 'reset-password';

export function createAuthChallenge(email: string, purpose: AuthChallengePurpose, payload?: unknown) {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const challenge = {
    id: randomUUID(),
    email: email.trim().toLowerCase(),
    purpose,
    codeHash: hashPassword(code),
    payload: payload === undefined ? null : JSON.stringify(payload),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };
  database.prepare('DELETE FROM auth_challenges WHERE email = ? AND purpose = ?').run(challenge.email, purpose);
  database.prepare(`INSERT INTO auth_challenges (id, email, purpose, code_hash, payload, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(challenge.id, challenge.email, challenge.purpose, challenge.codeHash, challenge.payload, challenge.expiresAt, challenge.createdAt);
  return { ...challenge, code };
}

export function consumeAuthChallenge(email: string, purpose: AuthChallengePurpose, code: string) {
  const challenge = database.prepare(`SELECT id, code_hash AS codeHash, payload, expires_at AS expiresAt, attempts FROM auth_challenges WHERE email = ? AND purpose = ?`)
    .get(email.trim().toLowerCase(), purpose) as { id: string; codeHash: string; payload: string | null; expiresAt: string; attempts: number } | undefined;
  if (!challenge || new Date(challenge.expiresAt) <= new Date() || challenge.attempts >= 5) return null;
  if (hashPassword(code.trim()) !== challenge.codeHash) {
    database.prepare('UPDATE auth_challenges SET attempts = attempts + 1 WHERE id = ?').run(challenge.id);
    return null;
  }
  database.prepare('DELETE FROM auth_challenges WHERE id = ?').run(challenge.id);
  return challenge.payload ? JSON.parse(challenge.payload) as Record<string, unknown> : {};
}
