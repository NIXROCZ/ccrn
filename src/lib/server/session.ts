import type { Env } from '../../env';

import { sha256 } from './db';

const MAGIC_TTL = 15 * 60;
const SESSION_TTL = 30 * 24 * 60 * 60;

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function createMagicLink(env: Pick<Env, 'KV' | 'SITE_PEPPER'>, email: string): Promise<string> {
  const token = randomToken();
  await env.KV.put(`magic:${await sha256(`${env.SITE_PEPPER}:${token}`)}`, email, { expirationTtl: MAGIC_TTL });
  return token;
}

export async function consumeMagicLink(env: Pick<Env, 'KV' | 'SITE_PEPPER'>, token: string): Promise<string | null> {
  const key = `magic:${await sha256(`${env.SITE_PEPPER}:${token}`)}`;
  const email = await env.KV.get(key);
  if (!email) return null;
  await env.KV.delete(key);
  return email;
}

export async function createSession(env: Pick<Env, 'KV' | 'SITE_PEPPER'>, email: string): Promise<string> {
  const token = randomToken();
  await env.KV.put(`session:${await sha256(`${env.SITE_PEPPER}:${token}`)}`, JSON.stringify({ email, createdAt: new Date().toISOString() }), { expirationTtl: SESSION_TTL });
  return token;
}

export async function sessionEmail(env: Pick<Env, 'KV' | 'SITE_PEPPER'>, token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const value = await env.KV.get(`session:${await sha256(`${env.SITE_PEPPER}:${token}`)}`, 'json') as { email?: string } | null;
  return value?.email ?? null;
}

export function setSessionCookie(headers: Headers, token: string): void {
  headers.append('Set-Cookie', `__Host-rn_session=${encodeURIComponent(token)}; Max-Age=${SESSION_TTL}; Path=/; HttpOnly; Secure; SameSite=Lax`);
}

export function clearSessionCookie(headers: Headers): void {
  headers.append('Set-Cookie', '__Host-rn_session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax');
}

export function sessionTokenFromCookie(cookie: string | null): string | undefined {
  return cookie?.split(';').map((part) => part.trim()).find((part) => part.startsWith('__Host-rn_session='))?.split('=')[1];
}
