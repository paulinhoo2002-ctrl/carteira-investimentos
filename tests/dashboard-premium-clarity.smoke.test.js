const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const test = require('node:test');

function resolveBrowser() {
  return [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean).find(candidate => {
    try { fs.accessSync(candidate); return true; } catch { return false; }
  });
}

async function startServer(rootDir) {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url || '/', 'http://127.0.0.1').pathname);
      const relative = pathname === '/' ? '/index.html' : pathname;
      const filePath = path.normalize(path.join(rootDir, relative));
      if (!filePath.startsWith(rootDir)) { res.writeHead(403); res.end(''); return; }
      const content = await fsp.readFile(filePath);
      const mime = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
      };
      res.writeHead(200, { 'Content-Type': mime[path.extname(filePath).toLowerCase()] || 'text/plain' });
      res.end(content);
    } catch (error) {
      res.writeHead(error.code === 'ENOENT' ? 404 : 500);
      res.end('');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}/index.html?testMode=1` };
}

const viewports = [
  { width: 390, height: 844, label: '390x844' },
  { width: 768, height: 1024, label: '768x1024' },
  { width: 1366, height: 768, label: '1366x768' },
  { width: 1920, height: 1080, label: '1920x1080' },
];

// Contrato visual aprovado V3 (HYBRID V2): no máximo 3 unidades primárias de
// KPI — Patrimônio atual (capital investido como contexto secundário dentro
// da unidade), Resultado (R$ + % compatíveis na mesma unidade) e Recebido.
// A antiga expectativa de oito métricas peer ("Total investido",
// "Rentabilidade", "Recebido no mês", "Média 12 meses", "Meta mensal",
// "Falta para meta") codificava o Dashboard pré-V3 substituído pela spec
// aprovada. A distinção financeira protegida pelo teste antigo continua
// afirmada: capital investido visível E distinto do patrimônio atual,
// resultado em R$ e %, renda rotulada como recebida (não estimativa).
const PRIMARY_KPI_UNITS_MAX = 3;

for (const viewport of viewports) {
  test(`Dashboard Premium Clarity - ${viewport.label}`, async () => {
    const executablePath = resolveBrowser();
    assert.ok(executablePath, 'Chrome/Edge não encontrado para o smoke Playwright');

    const harness = await startServer(path.join(__dirname, '..'));
    const { chromium } = await import('playwright-core');
    const browser = await chromium.launch({ executablePath, headless: true });
    const errors = [];
    const requestFailures = [];

    try {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        hasTouch: viewport.width <= 430,
        isMobile: viewport.width <= 430,
      });
      const page = await context.newPage();
      page.on('console', message => {
        if (message.type() === 'error') errors.push(`console: ${message.text()}`);
      });
      page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
      page.on('requestfailed', request => requestFailures.push(`${request.url()} (${request.failure()?.errorText || 'unknown'})`));

      await page.goto(harness.url, { waitUntil: 'networkidle' });
      await page.evaluate(() => go('dashboard'));
      await page.waitForSelector('.dashboard-analytical-primary', { state: 'visible', timeout: 5000 });
      await page.waitForSelector('.dashboard-executive-kpis', { state: 'visible', timeout: 5000 });

      const snapshot = await page.evaluate(() => {
        const visible = element => {
          const style = getComputedStyle(element);
          const box = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && box.width > 0 && box.height > 0;
        };
        const kpisRoot = document.querySelector('.dashboard-executive-kpis');
        const cards = [...(kpisRoot ? kpisRoot.querySelectorAll('.premium-metric') : [])].map(card => {
          const value = card.querySelector('.premium-metric-value');
          const cardBox = card.getBoundingClientRect();
          const valueBox = value ? value.getBoundingClientRect() : null;
          return {
            label: card.querySelector('.premium-metric-label')?.textContent.trim() || '',
            value: value?.textContent.trim() || '',
            note: card.querySelector('.premium-metric-note')?.textContent.trim() || '',
            visible: visible(card),
            cardWidth: cardBox?.width || 0,
            cardHeight: cardBox?.height || 0,
            valueWidth: valueBox?.width || 0,
            valueHeight: valueBox?.height || 0,
            valueScrollHeight: value?.scrollHeight || 0,
            valueClientHeight: value?.clientHeight || 0,
          };
        });
        return {
          kpisRootExists: !!kpisRoot,
          primaryKpiCount: cards.length,
          cards,
          investedPeerCount: cards.filter(card => /^Total investido$/i.test(card.label)).length,
          overflow: document.documentElement.scrollWidth > window.innerWidth,
          buttons: [...document.querySelectorAll('.dashboard-analytical-primary button, .dashboard-executive-kpis button')]
            .filter(visible)
            .map(button => ({ text: button.textContent.trim(), width: button.getBoundingClientRect().width, height: button.getBoundingClientRect().height })),
        };
      });

      // 1. O container executivo V3 existe e é o dono atual dos KPIs.
      assert.equal(snapshot.kpisRootExists, true, `dashboard-executive-kpis precisa existir em ${viewport.label}`);

      // 2. Densidade contratual: no máximo 3 unidades primárias de KPI.
      assert.ok(snapshot.primaryKpiCount >= 1 && snapshot.primaryKpiCount <= PRIMARY_KPI_UNITS_MAX,
        `unidades primárias de KPI (${snapshot.primaryKpiCount}) excedem o máximo ${PRIMARY_KPI_UNITS_MAX} em ${viewport.label}`);

      const findCard = label => snapshot.cards.find(card => card.label === label);

      // 3. Patrimônio atual é unidade primária, visível e com valor.
      const patrimony = findCard('Patrimônio atual');
      assert.ok(patrimony, `KPI primário "Patrimônio atual" precisa existir em ${viewport.label}`);
      assert.equal(patrimony.visible, true, `"Patrimônio atual" não está visível em ${viewport.label}`);
      assert.ok(patrimony.value.length > 0, `"Patrimônio atual" não tem valor em ${viewport.label}`);

      // 4-5. Capital investido permanece visível DENTRO da unidade Patrimônio,
      // com rótulo semântico explícito ("Investido R$ ..."), distinto do valor
      // patrimonial — preservando a distinção financeira do teste antigo.
      assert.match(patrimony.note, /Investido\s+R\$/i,
        `capital investido precisa estar visível e rotulado dentro da unidade Patrimônio em ${viewport.label} (nota: "${patrimony.note}")`);
      assert.ok(patrimony.value !== patrimony.note, `valor patrimonial e capital investido precisam permanecer distintos em ${viewport.label}`);

      // 6. Capital investido NÃO é um quarto KPI peer (estrutura pré-V3 proibida).
      assert.equal(snapshot.investedPeerCount, 0,
        `"Total investido" não pode voltar como KPI peer em ${viewport.label}; pertence ao contexto da unidade Patrimônio`);

      // 7. Resultado permanece unidade primária própria, com R$ e % na mesma
      // unidade quando compatíveis (o antigo "Resultado geral" + "Rentabilidade"
      // peer não podem voltar, mas as duas medidas continuam visíveis).
      const resultado = findCard('Resultado');
      assert.ok(resultado, `KPI primário "Resultado" precisa existir em ${viewport.label}`);
      assert.equal(resultado.visible, true, `"Resultado" não está visível em ${viewport.label}`);
      assert.ok(resultado.value.length > 0, `"Resultado" não tem valor em ${viewport.label}`);
      assert.match(resultado.value, /R\$/, `"Resultado" precisa exibir medida em R$ em ${viewport.label}`);
      assert.match(resultado.value, /%/, `"Resultado" precisa exibir o retorno percentual compatível na mesma unidade em ${viewport.label} (valor: "${resultado.value}")`);

      // 8. Recebido permanece unidade primária própria, rotulada como renda
      // RECEBIDA — recebido não pode ser confundido com estimativa/futuro.
      const recebido = findCard('Recebido');
      assert.ok(recebido, `KPI primário "Recebido" precisa existir em ${viewport.label}`);
      assert.equal(recebido.visible, true, `"Recebido" não está visível em ${viewport.label}`);
      assert.ok(recebido.value.length > 0, `"Recebido" não tem valor em ${viewport.label}`);
      assert.match(recebido.note, /recebid/i, `renda precisa estar rotulada como recebida (não estimativa/futuro) em ${viewport.label} (nota: "${recebido.note}")`);

      // Preservação geométrica do teste antigo: nenhuma quebra vertical nos
      // valores das unidades primárias.
      for (const card of snapshot.cards) {
        assert.ok(card.cardWidth > 0 && card.cardHeight > 0, `"${card.label}" sem bounding box em ${viewport.label}`);
        assert.ok(card.valueWidth > 0 && card.valueHeight > 0, `"${card.label}" sem valor visível em ${viewport.label}`);
        assert.ok(card.valueScrollHeight <= card.valueClientHeight + 1, `"${card.label}" quebrou verticalmente em ${viewport.label}`);
      }
      assert.equal(snapshot.overflow, false, `overflow horizontal em ${viewport.label}`);
      for (const button of snapshot.buttons) {
        assert.ok(button.width >= 44 && button.height >= 44, `CTA menor que 44px: ${button.text} em ${viewport.label}`);
      }
      assert.equal(errors.length, 0, `telemetria console/pageerror em ${viewport.label}: ${errors.join(' | ')}`);
      assert.equal(requestFailures.length, 0, `requestfailed em ${viewport.label}: ${requestFailures.join(' | ')}`);

      await context.close();
    } finally {
      await browser.close();
      harness.server.close();
    }
  });
}
