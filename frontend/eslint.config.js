import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Lint do frontend (#160): regras recomendadas de JavaScript, TypeScript e React Hooks.
// typescript-eslint ainda não suporta TypeScript 7; por isso o frontend fica no TypeScript 6.0 (ADR 0007).
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
  },
  {
    // Backend falso (npm run mock) e esta configuração rodam no Node, não no navegador
    files: ['mock/**/*.mjs', 'eslint.config.js'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
]);
