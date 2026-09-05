import type { APIRoute } from 'astro';
import { dbFirst, dbRun, sha256 } from '../../../lib/server/db';

export const prerender = false;
export const GET: APIRoute = async ({ url, locals }) => {
  const token = url.searchParams.get('token') ?? '';
  const env = locals.runtime.env;
  const subscriber = await dbFirst<{ id: string }>(env, 'SELECT id FROM subscribers WHERE confirm_token_hash = ? AND status = ?', await sha256(`${env.SITE_PEPPER}:${token}`), 'pending');
  if (subscriber) await dbRun(env, 'UPDATE subscribers SET status = ?, confirmed_at = CURRENT_TIMESTAMP, confirm_token_hash = NULL WHERE id = ?', 'confirmed', subscriber.id);
  return new Response(`<h1>${subscriber ? 'Subscription confirmed' : 'Link expired'}</h1><p>You can close this page.</p>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
};
