import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
export default tseslint.config(eslint.configs.recommended, ...tseslint.configs.recommended, ...astro.configs['flat/recommended'], {
  ignores: ['dist/**', '.astro/**', 'src/generated/**'],
  languageOptions: { globals: { process: 'readonly', console: 'readonly', Buffer: 'readonly', fetch: 'readonly', localStorage: 'readonly', window: 'readonly', document: 'readonly', URL: 'readonly', URLSearchParams: 'readonly', CustomEvent: 'readonly', setTimeout: 'readonly', Number: 'readonly', String: 'readonly', Object: 'readonly', JSON: 'readonly', Intl: 'readonly' } },
});
