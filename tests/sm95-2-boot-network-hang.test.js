'use strict';
// SM95.2: a abertura não pode ficar presa na tela em branco quando o Firebase/fontes não respondem.
// Antes: document.write + <link> de fontes bloqueavam o parser; o documento ficava em readyState "loading" sem body.
const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');
const { resolveChromePath } = require('./helpers/chrome-path');

const repo = path.join(__dirname, '..');
const EXTERNAL = /fonts\.googleapis|gstatic\.com|googleapis\.com|identitytoolkit|accounts\.google/i;

test('rede travada (Firebase e fontes sem resposta) não impede o app de renderizar a tela de acesso', async () => {
  const harness = await startLocalHttpServer(repo);
  const browser = await chromium.launch({ executablePath: resolveChromePath(), headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block', locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
    const page = await context.newPage();
    await page.route(EXTERNAL, () => new Promise(() => { })); // nunca responde
    await page.goto(new URL('/', harness.url).href, { waitUntil: 'commit', timeout: 20000 });
    await page.waitForFunction(() => document.body && document.body.innerText.trim().length > 0, null, { timeout: 15000 });
    const text = await page.evaluate(() => document.body.innerText);
    assert.match(text, /Entre com Google|Verificando|ACESSO RESTRITO/i, 'a tela de acesso precisa aparecer em vez de ficar em branco');
    await context.close();
  } finally {
    await browser.close();
    harness.server.close();
  }
});

test('o carregamento do Firebase não bloqueia o parser: scripts são inseridos de forma dinâmica e limitada no tempo', async () => {
  const fs = require('node:fs');
  const html = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
  assert.equal(/document\.write\(\s*\[\s*'<script src="https:\/\/www\.gstatic\.com/.test(html), false, 'document.write síncrono de Firebase não pode voltar');
  assert.match(html, /window\.__FIREBASE_READY__=new Promise/);
  assert.match(html, /setTimeout\(\(\)=>\{ timedOut=true;/);
  assert.match(html, /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2\?family=Inter[^"]*" media="print" onload="this\.media='all'">/);
});

// SM156: o contrato antigo (guarda `!FB.app`) impedia a recuperação quando FB.app já existia com SDK parcial (R1).
// A garantia correta é a idempotência de initFirebase: a inicialização tardia não duplica app, listeners nem assinaturas.
test('carregamento tardio do Firebase não reinicializa o app (initFirebase idempotente por FB.bootstrapped)', () => {
  const fs = require('node:fs');
  const html = fs.readFileSync(path.join(repo, 'index.html'), 'utf8');
  assert.ok(html.includes('if(FB.bootstrapped) return;'), 'initFirebase precisa ser idempotente antes de chamar o SDK');
  assert.ok(html.includes('if(!FB.listenersAttached){'), 'listeners e assinaturas de autenticação só podem ser anexados uma vez');
});
