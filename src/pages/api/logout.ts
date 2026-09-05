import type { APIRoute } from 'astro';
import { clearSessionCookie } from '../../lib/server/session';

export const prerender = false;
export const POST: APIRoute = async () => {
  const headers = new Headers({ 'Content-Type': 'application/json' });
  clearSessionCookie(headers);
  return new Response(JSON.stringify({ ok: true }), { headers });
};
