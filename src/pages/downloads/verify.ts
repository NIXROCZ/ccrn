import type { APIRoute } from 'astro';
import { consumeMagicLink, createSession, setSessionCookie } from '../../lib/server/session';

export const prerender = false;
export const GET: APIRoute = async ({ url, locals }) => {
  const email = await consumeMagicLink(locals.runtime.env, url.searchParams.get('token') ?? '');
  if (!email) return new Response('This link is invalid or has expired.', { status: 400 });
  const token = await createSession(locals.runtime.env, email);
  const headers = new Headers({ Location: '/downloads' });
  setSessionCookie(headers, token);
  return new Response(null, { status: 302, headers });
};
