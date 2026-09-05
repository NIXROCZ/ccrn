import type { APIRoute } from 'astro';
import { clearSessionCookie } from '../../lib/server/session';

export const prerender = false;
export const POST: APIRoute = async () => {
  const headers = new Headers({ Location: '/downloads' });
  clearSessionCookie(headers);
  return new Response(null, { status: 303, headers });
};
