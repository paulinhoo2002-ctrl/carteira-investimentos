const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');

const repoRoot = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function readRaw(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath));
}

function compact(text) {
  return text.replace(/\s+/g, ' ');
}

function assertNoBom(relativePath) {
  const raw = readRaw(relativePath);
  assert.equal(raw.slice(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), false, `${relativePath} nao pode ter BOM`);
}

test('documentos da Sprint 3.1 continuam completos e coerentes', () => {
  const playbook = compact(read('docs/PRODUCT_DESIGN_PLAYBOOK.md'));
  const spec = compact(read('docs/DESIGN_SYSTEM_SPECIFICATION.md'));
  const decisions = compact(read('docs/DESIGN_DECISIONS.md'));

  for (const file of [
    'docs/PRODUCT_DESIGN_PLAYBOOK.md',
    'docs/DESIGN_SYSTEM_SPECIFICATION.md',
    'docs/DESIGN_DECISIONS.md',
  ]) {
    assertNoBom(file);
  }

  assert.match(playbook, /# Product Design Playbook/);
  assert.match(playbook, /## Missao do produto/);
  assert.match(playbook, /## Filosofia/);
  assert.match(playbook, /fundacao visual primeiro, migracao de tela depois/);
  assert.match(playbook, /## Regras para desktop e mobile/);
  assert.match(playbook, /## Acessibilidade/);
  assert.match(playbook, /## Performance visual/);
  assert.match(playbook, /## Regra de aprovacao visual/);

  assert.match(spec, /# Design System Specification/);
  assert.match(spec, /## Principios/);
  assert.match(spec, /## Inventario visual atual/);
  assert.match(spec, /## Tokens oficiais/);
  assert.match(spec, /## Convencao de nomes/);
  assert.match(spec, /## Aliases de compatibilidade/);
  assert.match(spec, /## Componentes planejados/);
  assert.match(spec, /## Estados obrigatorios/);
  assert.match(spec, /## Acessibilidade/);
  assert.match(spec, /## Governanca/);
  assert.match(spec, /## Notes sobre breakpoints|## Notas sobre breakpoints/);
  assert.match(spec, /--radius-xl/);
  assert.match(spec, /--font-size-display/);
  assert.match(spec, /--breakpoint-lg/);
  assert.match(spec, /Eles nao substituem media queries tradicionais/);

  assert.match(decisions, /# Design Decisions/);
  assert.match(decisions, /## Contexto anterior/);
  assert.match(decisions, /## Aprendizados/);
  assert.match(decisions, /fundacao visual e funcionalidade seguem escopos separados/);
  assert.match(decisions, /Dividendos V4 mostrou que leitura compacta precisa de menos caixas/);
  assert.match(decisions, /## Separacao de escopo/);
  assert.match(decisions, /## Decisoes adiadas/);
  assert.match(decisions, /## Criterio de sucesso/);
});

test('camada moderna expõe tokens e a11y base da fundacao', () => {
  const styles = read('modern/src/styles.css');

  assertNoBom('modern/src/styles.css');
  assert.match(styles, /--color-bg-canvas:/);
  assert.match(styles, /--color-bg-surface:/);
  assert.match(styles, /--color-bg-surface-2:/);
  assert.match(styles, /--color-bg-panel:/);
  assert.match(styles, /--color-bg-panel-2:/);
  assert.match(styles, /--color-border-default:/);
  assert.match(styles, /--color-border-soft:/);
  assert.match(styles, /--color-text-primary:/);
  assert.match(styles, /--color-text-secondary:/);
  assert.match(styles, /--color-text-tertiary:/);
  assert.match(styles, /--color-accent-primary:/);
  assert.match(styles, /--color-accent-success:/);
  assert.match(styles, /--color-accent-warning:/);
  assert.match(styles, /--color-accent-danger:/);
  assert.match(styles, /--color-accent-info:/);
  assert.match(styles, /--font-family-base:/);
  assert.match(styles, /--font-size-xs:/);
  assert.match(styles, /--font-size-sm:/);
  assert.match(styles, /--font-size-md:/);
  assert.match(styles, /--font-size-lg:/);
  assert.match(styles, /--font-size-xl:/);
  assert.match(styles, /--font-size-display:/);
  assert.match(styles, /--space-9:/);
  assert.match(styles, /--space-10:/);
  assert.match(styles, /--radius-xs:/);
  assert.match(styles, /--radius-xl:/);
  assert.match(styles, /--shadow-1:/);
  assert.match(styles, /--shadow-2:/);
  assert.match(styles, /--shadow-3:/);
  assert.match(styles, /--border-width-1:/);
  assert.match(styles, /--border-width-2:/);
  assert.match(styles, /--motion-duration-fast:/);
  assert.match(styles, /--motion-duration-base:/);
  assert.match(styles, /--motion-duration-slow:/);
  assert.match(styles, /--ease-standard:/);
  assert.match(styles, /--z-content:/);
  assert.match(styles, /--z-toast:/);
  assert.match(styles, /--bg:/);
  assert.match(styles, /--panel:/);
  assert.match(styles, /--surface:/);
  assert.match(styles, /--border:/);
  assert.match(styles, /--text:/);
  assert.match(styles, /--muted:/);
  assert.match(styles, /--primary:/);
  assert.match(styles, /--success:/);
  assert.match(styles, /--warning:/);
  assert.match(styles, /--danger:/);
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
});

test('modern/dist continua fora do indice', () => {
  const tracked = execFileSync('git', ['ls-files', 'modern/dist'], {
    cwd: repoRoot,
    encoding: 'utf8',
  }).trim();

  assert.equal(tracked, '');
});
