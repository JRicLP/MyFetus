// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Política de logs (E7-06): nenhum console.* no app em produção.
    // Bloqueia log, info, debug, warn, error e demais métodos.
    files: ['**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-console': 'error',
    },
  },
  {
    // Exceções documentadas em docs/politica-de-logs.md
    files: ['**/*.test.{js,jsx,ts,tsx}', '**/__tests__/**', 'scripts/**'],
    rules: {
      'no-console': 'off',
    },
  },
]);
