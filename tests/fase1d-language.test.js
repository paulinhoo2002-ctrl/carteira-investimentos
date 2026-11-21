'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { resolveChromePath } = require('./helpers/chrome-path');

const repo = path.join(__dirname, '..');

test('D3: códigos viram mensagens acessíveis em português sem mudar estados internos', async () => {
  const harness = await startLocalHttpServer(repo);
  const browser = await chromium.launch({ executablePath: resolveChromePath(), headless: true });
  try {
    const page = await browser.newPage({ locale: 'pt-BR' });
    await page.goto(harness.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const result = await page.evaluate(() => {
      const original = {
        status: 'UNKNOWN',
        completeness: 'PARTIAL',
        reason: 'LAYOUT_NOT_RECOGNIZED',
        identityReason: 'SOURCE_IDENTITY_UNCONFIRMED',
        rowsReason: 'NO_VALID_ROWS',
        capability: 'UNSUPPORTED'
      };
      const root = document.createElement('section');
      root.innerHTML = '<p>LAYOUT_NOT_RECOGNIZED · SOURCE_IDENTITY_UNCONFIRMED · NO_VALID_ROWS · UNSUPPORTED · UNKNOWN · PARTIAL</p><button title="UNKNOWN" aria-label="PARTIAL" placeholder="UNSUPPORTED" data-status="UNKNOWN">Ação</button><code>UNKNOWN</code>';
      localizeUiCodes(root);
      return {
        text: root.querySelector('p').textContent,
        title: root.querySelector('button').title,
        accessibleName: root.querySelector('button').getAttribute('aria-label'),
        placeholder: root.querySelector('button').getAttribute('placeholder'),
        internalAttribute: root.querySelector('button').getAttribute('data-status'),
        codeText: root.querySelector('code').textContent,
        original,
        renderedHeading: (() => { go('aportes'); return document.querySelector('#root h1')?.textContent.trim(); })()
      };
    });
    assert.match(result.text, /Layout do arquivo não reconhecido/);
    assert.match(result.text, /Identidade da origem não confirmada/);
    assert.match(result.text, /Nenhuma linha válida encontrada/);
    assert.match(result.text, /Formato não compatível/);
    assert.match(result.text, /Desconhecido · Parcial/);
    assert.equal(result.title, 'Desconhecido');
    assert.equal(result.accessibleName, 'Parcial');
    assert.equal(result.placeholder, 'Formato não compatível');
    assert.equal(result.internalAttribute, 'UNKNOWN');
    assert.equal(result.codeText, 'UNKNOWN');
    assert.deepEqual(result.original, {
      status: 'UNKNOWN', completeness: 'PARTIAL', reason: 'LAYOUT_NOT_RECOGNIZED',
      identityReason: 'SOURCE_IDENTITY_UNCONFIRMED', rowsReason: 'NO_VALID_ROWS', capability: 'UNSUPPORTED'
    });
    assert.equal(result.renderedHeading, 'Lançamentos');
  } finally {
    await browser.close();
    harness.server.close();
  }
});
