import type { Env } from '../../env';

import { z } from 'zod';
import { sha256 } from './db';

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function clientIp(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ?? 'unknown';
}

export async function readJson<T>(request: Request, env: Pick<Env, 'SITE_URL'>, schema: z.ZodType<T>): Promise<{ data: T; ip: string }> {
  if (request.method !== 'POST') throw new HttpError(405, 'Method not allowed');
  const origin = request.headers.get('Origin');
  if (origin !== new URL(env.SITE_URL).origin) throw new HttpError(403, 'Origin not allowed');
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) throw new HttpError(415, 'JSON content required');
  const length = Number(request.headers.get('Content-Length') ?? 0);
  if (length > 16 * 1024) throw new HttpError(413, 'Request body is too large');
  const text = await request.text();
  if (text.length > 16 * 1024) throw new HttpError(413, 'Request body is too large');
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new HttpError(400, 'Invalid JSON'); }
  const result = schema.safeParse(parsed);
  if (!result.success) throw new HttpError(400, 'Invalid request');
  return { data: result.data, ip: clientIp(request) };
}

export async function verifyTurnstile(env: Pick<Env, 'TURNSTILE_SECRET_KEY'>, token: string | undefined, ip: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: ip }),
  });
  const result = await response.json() as { success?: boolean };
  return Boolean(result.success);
}

export async function hashedIp(env: Pick<Env, 'SITE_PEPPER'>, ip: string): Promise<string> {
  return sha256(`${env.SITE_PEPPER}:${ip}`);
}
