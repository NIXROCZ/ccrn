import type { Env } from '../../env';

export type DbEnv = Pick<Env, 'DB'>;

export async function dbAll<T>(env: DbEnv, sql: string, ...args: unknown[]): Promise<T[]> {
  const result = await env.DB.prepare(sql).bind(...args).all<T>();
  return result.results;
}

export async function dbFirst<T>(env: DbEnv, sql: string, ...args: unknown[]): Promise<T | null> {
  return (await env.DB.prepare(sql).bind(...args).first<T>()) ?? null;
}

export type DbRunResult = { success: boolean; meta?: { changes?: number } };

export async function dbRun(env: DbEnv, sql: string, ...args: unknown[]): Promise<DbRunResult> {
  return env.DB.prepare(sql).bind(...args).run() as Promise<DbRunResult>;
}

export function id(): string {
  return crypto.randomUUID();
}

export function orderNumber(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return `RN-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...(init.headers ?? {}) },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, { status });
}
