import { defineMiddleware } from 'astro:middleware';
import { securityHeaders } from './lib/security-headers';
export const onRequest = defineMiddleware(async ({ request }, next) => {
  const response = await next();
  if (!request.url.includes('/_astro/')) for (const [key, value] of Object.entries(securityHeaders)) response.headers.set(key, value);
  return response;
});
