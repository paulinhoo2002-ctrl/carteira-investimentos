'use strict';
// Exportações estruturadas (CSV/JSON de relatórios e CSV do IRPF) não podem mudar com a formatação pt-BR
// de percentuais na tela (F-09). Os hashes abaixo foram obtidos de `origin/main` @ f8fef82 com fixtures
// sintéticas e relógio congelado (script de origem: tests/fase1c-export-integrity.test.js com EXPORT_HASH_DUMP=1
// aplicado à referência); a árvore atual deve reproduzi-los byte a byte. Se um dia uma exportação mudar de
// propósito, atualize os hashes junto com a decisão de produto — nunca para "fazer o teste passar".
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { applyRichFixture } = require('./helpers/fp-rich-fixture');
const { syntheticRfTitles } = require('./helpers/v17-fin-fixture');
const { resolveChromePath } = require('./helpers/chrome-path');

const repo = path.join(__dirname, '..');
const NOW = new Date('2026-11-08T15:00:00Z');
const TYPES = ['complete', 'assets', 'proventos', 'fixed', 'patrimony', 'audit', 'irpf'];
const EXPECTED = require('./fixtures/fase1c-export-hashes.json');

async function collect() {
  const harness = await startLocalHttpServer(repo);
  const browser = await chromium.launch({ executablePath: resolveChromePath(), headless: true });
  const result = {};
  try {
    for (const mode of ['completo', 'parcial']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
      await page.clock.setFixedTime(NOW);
      await page.goto(harness.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await applyRichFixture(page, NOW);
      if (mode === 'parcial') {
        await page.evaluate(titles => {
          const keep = S.assets.filter(asset => asset.type !== 'Renda Fixa');
          S.assets = [...keep, ...JSON.parse(JSON.stringify(titles))];
          S.wallets[0].assets = JSON.parse(JSON.stringify(S.assets));
          render();
        }, syntheticRfTitles());
      }
      for (const type of TYPES) {
        for (const kind of ['CSV', 'JSON']) {
          if (kind === 'JSON' && type === 'irpf') continue;
          const content = await page.evaluate(({ type, kind }) => {
            const captured = [];
            const originalDownload = window.downloadTextFile;
            const originalIrpf = window.irpfDownloadText;
            window.downloadTextFile = (name, text) => { captured.push(String(text)); };
            window.irpfDownloadText = (name, text) => { captured.push(String(text)); };
            window.toast = () => {};
            try { if (kind === 'CSV') exportReportCSV(type); else exportReportJSON(type); } catch (error) { captured.push(`ERRO ${error.message}`); }
            window.downloadTextFile = originalDownload;
            window.irpfDownloadText = originalIrpf;
            return captured.join('\n---\n');
          }, { type, kind });
          result[`${mode}|${type}|${kind}`] = { sha: crypto.createHash('sha256').update(content).digest('hex').slice(0, 16), length: content.length };
        }
      }
      await page.close();
    }
  } finally {
    await browser.close();
    harness.server.close();
  }
  return result;
}

test('exportações estruturadas (CSV/JSON/IRPF) reproduzem byte a byte as da referência de produção', async () => {
  const actual = await collect();
  if (process.env.EXPORT_HASH_DUMP) { console.log(JSON.stringify(actual, null, 1)); return; }
  assert.deepEqual(Object.keys(actual).sort(), Object.keys(EXPECTED.hashes).sort());
  for (const [key, value] of Object.entries(actual)) {
    assert.ok(value.length > 0, `${key}: exportação vazia (fixture sem dados?)`);
    assert.equal(value.sha, EXPECTED.hashes[key].sha, `${key}: conteúdo da exportação mudou`);
    assert.equal(value.length, EXPECTED.hashes[key].length, `${key}: tamanho da exportação mudou`);
  }
});

test('hashes esperados têm origem documentada e nenhuma exportação traz percentual com vírgula decorativa', () => {
  assert.match(EXPECTED.meta.baselineSha, /^[0-9a-f]{40}$/);
  assert.match(EXPECTED.meta.origin, /origin\/main/);
  assert.equal(Object.keys(EXPECTED.hashes).length, 26);
});
