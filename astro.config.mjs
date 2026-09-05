import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://raisingnoble.com',
  output: 'static',
  session: { driver: 'memory' },
  adapter: cloudflare({ platformProxy: { enabled: true } }),
  integrations: [sitemap()],
  vite: { build: { assetsInlineLimit: 0 } },
  build: { inlineStylesheets: 'never' },
});
