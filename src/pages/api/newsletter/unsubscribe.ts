import type { APIRoute } from 'astro';
import { dbFirst, dbRun, sha256 } from '../../../lib/server/db';

export const prerender = false;
export const GET: APIRoute = async ({ url, locals }) => {
  const token = url.searchParams.get('token') ?? '';
  const env = locals.runtime.env;
  const subscriber = await dbFirst<{ id: string }>(env, 'SELECT id FROM subscribers WHERE unsub_token_hash = ?', await sha256(`${env.SITE_PEPPER}:${token}`));
  if (subscriber) await dbRun(env, 'UPDATE subscribers SET status = ?, unsubscribed_at = CURRENT_TIMESTAMP WHERE id = ?', 'unsubscribed', subscriber.id);
  return new Response(`<h1>${subscriber ? 'Unsubscribed' : 'Link expired'}</h1><p>You can close this page.</p>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
};
