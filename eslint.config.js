import js from '@eslint/js';
import globals from 'globals';

// On top of ESLint's recommended rules.
const rules = {
  'no-var': 'error',
  'prefer-const': 'error',
  eqeqeq: ['error', 'smart'],
  'no-shadow': 'error',
  'no-unused-vars': ['error', { args: 'after-used' }],
  'no-empty': ['error', { allowEmptyCatch: true }]
};

export default [
  { ignores: ['playwright-report/', 'test-results/'] },
  js.configs.recommended,
  // The app: ES modules that run in the browser.
  { files: ['js/**/*.js'], languageOptions: { sourceType: 'module', globals: globals.browser }, rules },
  // The service worker: a classic script with its own globals.
  {
    files: ['service-worker.js'],
    languageOptions: { sourceType: 'script', globals: globals.serviceworker },
    rules
  },
  // Tests and config files run in Node; end-to-end tests also run code inside the page.
  {
    files: ['tests/**/*.js', '*.config.js'],
    languageOptions: { sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
    rules
  }
];
