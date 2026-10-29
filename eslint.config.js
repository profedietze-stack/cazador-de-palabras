// ESLint 9 (flat config) para el cliente y el servidor.
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default tseslint.config(
  { ignores: ['dist/**', 'server/dist/**', 'node_modules/**', 'server/node_modules/**', 'docs-privado/**', '.playwright-mcp/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      // El código del juego usa `any` puntual en el DOM (_rafId, webkit*): se avisa, no se frena.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['server/src/**/*.ts', 'tools/**/*.mjs', 'vite.config.ts', 'vitest.config.ts', 'pocketbase/**/*.mjs', '*.js'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    // Los hooks y migraciones de PocketBase corren en un JSVM con globales propios.
    files: ['pocketbase/**/*.js'],
    languageOptions: { globals: { ...globals.node, migrate: 'readonly', onRecordCreateRequest: 'readonly', Collection: 'readonly', BadRequestError: 'readonly', toString: 'readonly', TextField: 'readonly' } },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-undef': 'off',
      '@typescript-eslint/triple-slash-reference': 'off',   // /// <reference path="../pb_data/types.d.ts" /> es la forma de PocketBase
      '@typescript-eslint/no-unused-vars': 'off',
      'no-useless-assignment': 'off',
    },
  },
  {
    // Service worker: globales del worker (self, caches, clients...), no del navegador.
    files: ['public/sw.js'],
    languageOptions: { globals: { ...globals.serviceworker, __PRECACHE__: 'readonly' } },
  },
)
