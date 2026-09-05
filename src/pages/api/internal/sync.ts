import type { APIRoute } from 'astro';
import { jsonResponse, errorResponse, sha256 } from '../../../lib/server/db';

export const prerender = false;

function constantTimeEqual(left: string, right: string): boolean {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  let difference = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) difference |= (a[index % (a.length || 1)] ?? 0) ^ (b[index % (b.length || 1)] ?? 0);
  return difference === 0;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const provided = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!constantTimeEqual(provided, env.SYNC_TOKEN)) return errorResponse('Unauthorized', 401);
  const objects: { key: string; etag?: string }[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.KITS.list({ prefix: 'kits/', cursor });
    objects.push(...(page.objects as Array<{ key: string; etag?: string }>).map((object) => ({ key: object.key, etag: object.etag })));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  objects.sort((a, b) => a.key.localeCompare(b.key));
  const manifest = await sha256(JSON.stringify(objects));
  const previous = await env.CATALOGUE_KV.get('catalogue:manifest-hash');
  if (previous === manifest) return jsonResponse({ changed: false, manifest });
  await env.CATALOGUE_KV.put('catalogue:manifest-hash', manifest);
  if (env.DEPLOY_HOOK_URL) await fetch(env.DEPLOY_HOOK_URL, { method: 'POST' });
  return jsonResponse({ changed: true, manifest, objects: objects.length });
};
