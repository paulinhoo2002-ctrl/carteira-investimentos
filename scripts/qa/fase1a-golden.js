#!/usr/bin/env node
'use strict';
// Gera tests/fixtures/fase1a-golden.json a partir de uma REFERÊNCIA do Git (padrão: origin/main).
// O golden NÃO é a saída da árvore atual: é a saída da referência, de modo que o teste hermético
// (tests/fase1a-golden.test.js) detecta qualquer divergência financeira da árvore atual em relação
// à produção, sem precisar do Git no CI. Diferenças intencionais ficam listadas no próprio golden.
//
// Uso: node scripts/qa/fase1a-golden.js [--baseline origin/main] [--out tests/fixtures/fase1a-golden.json]
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { collectSnapshot, FROZEN_NOW } = require('../../tests/helpers/fase1-snapshot');

const repo = path.join(__dirname, '..', '..');
const args = process.argv.slice(2);
const option = (name, fallback) => { const index = args.indexOf(name); return index >= 0 ? args[index + 1] : fallback; };
const baseline = option('--baseline', 'origin/main');
const out = path.resolve(repo, option('--out', 'tests/fixtures/fase1a-golden.json'));
const git = gitArgs => execFileSync('git', ['--no-optional-locks', ...gitArgs], { cwd: repo, maxBuffer: 256 * 1024 * 1024 });

// Diferenças já aprovadas e verificadas por outros testes; o golden não as cobre.
const INTENTIONAL = [
  { id: 'F-01', area: 'ativos (estado parcial)', description: 'Total investido passa a aparecer quando o capital aplicado é completo, mesmo com valor atual incompleto (regra de produto aprovada); a referência mostrava "—". Valor atual, resultado e rentabilidade seguem indisponíveis.', tokenAdditions: [{ state: 'partial', route: 'ativos', tokens: ['$95.982,00'] }] },
  { id: 'F-03/F-04', area: 'dashboard', description: 'Variação diária (novo KPI da V20): fórmula sobre o fechamento anterior e cobertura; testado em tests/fase1b-daily-variation.test.js. Não existe na referência.' },
  { id: 'V19/V20', area: 'dashboard, dividendos', description: 'Novos painéis e reorganização da V19/V20 (Valor investido, lançamentos recentes, Recebido no ano); o golden compara só os indicadores comparáveis (cx(), 3 cartões do Dashboard, KPIs e ranking de Dividendos) e as 11 telas sem mudança numérica.' },
];

(async () => {
  git(['rev-parse', '--verify', baseline]);
  const sha = git(['rev-parse', baseline]).toString().trim();
  const tree = fs.mkdtempSync(path.join(os.tmpdir(), 'fase1a-golden-'));
  try {
    const archive = git(['archive', '--format=tar', baseline]);
    const untar = spawnSync('tar', ['-x', '-f', '-'], { cwd: tree, input: archive, maxBuffer: 256 * 1024 * 1024 });
    if (untar.status !== 0) throw new Error(`tar falhou: ${String(untar.stderr).slice(0, 200)}`);
    fs.writeFileSync(path.join(tree, 'index.html'), git(['show', `${baseline}:index.html`]));
    const snapshot = await collectSnapshot(tree);
    Object.entries(snapshot).forEach(([name, state]) => { if (state.errors.length) throw new Error(`erros de página na referência (${name}): ${state.errors.join('; ')}`); });
    const expected = {};
    for (const [name, state] of Object.entries(snapshot)) {
      const { errors, ...rest } = state;
      if (rest.dividends) delete rest.dividends.fpPayers;
      expected[name] = rest;
    }
    const golden = {
      meta: {
        purpose: 'Valores esperados dos indicadores financeiros, obtidos da referência de produção (não da árvore atual).',
        baselineRef: baseline,
        baselineSha: sha,
        frozenNow: FROZEN_NOW,
        fixtures: ['tests/helpers/fp-rich-fixture.js', 'tests/helpers/v17-fin-fixture.js (títulos de RF)'],
        dataPolicy: 'Dados 100% sintéticos (tickers QA*). Nenhum dado real.',
        regenerate: `node scripts/qa/fase1a-golden.js --baseline ${baseline}`,
      },
      intentionalDifferences: INTENTIONAL,
      expected,
    };
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(golden, null, 1) + '\n');
    console.log(`golden gravado em ${path.relative(repo, out)} (referência ${baseline} @ ${sha.slice(0, 7)})`);
  } finally {
    fs.rmSync(tree, { recursive: true, force: true });
  }
})().catch(error => { console.error(error.message); process.exit(1); });
