import type { Env } from '../../env';

import { sha256 } from './db';

export async function rateLimit(env: Pick<Env, 'KV' | 'SITE_PEPPER'>, namespace: string, ip: string, limit: number, windowSeconds: number): Promise<boolean> {
  const key = `ratelimit:${namespace}:${await sha256(`${env.SITE_PEPPER}:${ip}`)}`;
  const now = Date.now();
  const current: number[] = (await env.KV.get(key, 'json') as number[] | null) ?? [];
  const active = current.filter((timestamp) => timestamp > now - windowSeconds * 1000);
  if (active.length >= limit) return false;
  active.push(now);
  await env.KV.put(key, JSON.stringify(active), { expirationTtl: windowSeconds });
  return true;
}
