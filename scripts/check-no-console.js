// scripts/check-no-console.js
const fs = require('fs');
const path = require('path');

const ROOTS = ['apps/mobile', 'apps/api'];
const SKIP_DIRS = new Set(['node_modules', '.expo', 'dist', 'build', 'coverage']);
const FILE = /\.(js|jsx|ts|tsx|mjs|cjs)$/;
const FORBIDDEN = /\bconsole\.(log|info|debug|warn|error|trace|dir)\s*\(/;

// Exceções documentadas em docs/politica-de-logs.md
const ALLOWED = [
  /[\\/]tests?[\\/]/,
  /[\\/]__tests__[\\/]/,
  /\.test\.[jt]sx?$/,
  /apps[\\/]api[\\/]scripts[\\/]/,
  /apps[\\/]api[\\/]workers[\\/]/,          // CLIs de ingestão/extração (pendente com P.O.)
  /apps[\\/]api[\\/]utils[\\/]logger\.js$/, // destino do logger central
];

const violations = [];
const exceptions = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(p);
      continue;
    }
    if (!FILE.test(entry.name)) continue;
    fs.readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
      if (!FORBIDDEN.test(line)) return;
      const hit = `${p}:${i + 1}`;
      (ALLOWED.some((r) => r.test(p)) ? exceptions : violations).push(hit);
    });
  }
}

ROOTS.filter(fs.existsSync).forEach(walk);

console.log(`Exceções documentadas: ${exceptions.length}`);
if (violations.length) {
  console.error(`Logs proibidos em produção (${violations.length}):\n${violations.join('\n')}`);
  process.exit(1);
}
console.log('OK: nenhum console.* em código de produção.');