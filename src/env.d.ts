/// <reference types="astro/client" />
import type { Runtime } from '@astrojs/cloudflare';

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  CATALOGUE_KV: KVNamespace;
  KITS: R2Bucket;
  ASSETS: Fetcher;
  SITE_URL: string;
  FROM_EMAIL: string;
  ORDERS_EMAIL: string;
  CONTACT_TO_EMAIL: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  RESEND_API_KEY: string;
  SITE_PEPPER: string;
  DEPLOY_HOOK_URL: string;
  TURNSTILE_SECRET_KEY?: string;
  PUBLIC_TURNSTILE_SITE_KEY?: string;
  PUBLIC_CF_BEACON_TOKEN?: string;
}

declare global {
  namespace App {
    interface Locals { runtime: Runtime<Env>['runtime'] }
  }
}
