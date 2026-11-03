'use strict';
// Probe: estado real de visibilidade das colunas da tabela de Ativos (#ativosAccordion).
// Somente leitura. Imprime assinatura estavel para comparar antes/depois de um patch.
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('../local-http-server');
const { applyV289VisualFixture } = require('../helpers/v289-visual-fixtures');

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable',
];
const CHROME = process.env.CHROME_PATH || CHROME_CANDIDATES.find(p => fs.existsSync(p)) || CHROME_CANDIDATES[0];
const WIDTHS = [390, 767, 768, 1024, 1099, 1100, 1181, 1280, 1366, 1499, 1535, 1536, 1799, 1800, 1920];

(async () => {
  const harness = await startLocalHttpServer(path.join(__dirname, '..', '..'));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: CHROME, headless: true });
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, colorScheme: 'dark' });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    await page.goto(harness.url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__LOCAL_TEST_MODE__ === true && typeof S !== 'undefined' && typeof render === 'function', null, { timeout: 15000 });
    await applyV289VisualFixture(page, 'baseline');
    await page.evaluate(() => { go('ativos'); });

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => {
        document.querySelectorAll('#ativosAccordion details').forEach(d => { d.open = true; });
      });
      const snap = await page.evaluate(() => {
        const table = document.querySelector('#ativosAccordion table.ag-table');
        if (!table) return { error: 'tabela #ativosAccordion table.ag-table nao encontrada' };
        const ths = [...table.querySelectorAll('thead th')];
        const firstRowTds = [...(table.querySelector('tbody tr')?.children || [])];
        const visible = (el) => el ? getComputedStyle(el).display !== 'none' : null;
        return {
          headers: ths.map((th, i) => ({
            idx: i + 1,
            label: th.textContent.trim(),
            className: th.className || '(sem class)',
            thVisible: visible(th),
            tdVisible: visible(firstRowTds[i]),
            minWidth: getComputedStyle(th).minWidth,
            width: Math.round(th.getBoundingClientRect().width),
          })),
          thCount: ths.length,
          tdCount: firstRowTds.length,
          tableWidth: table.getBoundingClientRect().width,
          scrollWidth: table.parentElement?.scrollWidth ?? null,
          // Regras posicionais que CASAM com a tabela viva de Ativos.
          // querySelector (nao table.matches): seletor com combinador descendente
          // exige que o SUJEITO (th/td) case — matches() no proprio <table> nunca casa.
          matchedPositionalRules: (() => {
            const out = [];
            for (const sheet of [...document.styleSheets]) {
              let rules; try { rules = [...sheet.cssRules]; } catch { continue; }
              const walk = (list, media) => {
                for (const rule of list) {
                  if (rule.cssRules && rule.conditionText) { walk([...rule.cssRules], rule.conditionText); continue; }
                  if (!rule.selectorText) continue;
                  if (!/:nth-child\(/.test(rule.selectorText)) continue;
                  if (!rule.selectorText.includes('ag-table')) continue;
                  try { if (table.querySelector(rule.selectorText)) out.push({ media: media || '(all)', selector: rule.selectorText, css: rule.style.cssText.slice(0, 160) }); } catch { /* selector invalido */ }
                }
              };
              walk(rules, null);
            }
            return out;
          })(),
          // Regras que NAO casam com NENHUMA tabela do app (candidatas a CSS morto)
          deadPositionalRules: (() => {
            const out = [];
            for (const sheet of [...document.styleSheets]) {
              let rules; try { rules = [...sheet.cssRules]; } catch { continue; }
              const walk = (list, media) => {
                for (const rule of list) {
                  if (rule.cssRules && rule.conditionText) { walk([...rule.cssRules], rule.conditionText); continue; }
                  if (!rule.selectorText) continue;
                  if (!/:nth-child\(/.test(rule.selectorText)) continue;
                  if (!rule.selectorText.includes('ag-table')) continue;
                  let hit = false;
                  try { hit = !!document.querySelector(rule.selectorText); } catch { continue; }
                  if (hit) continue;
                  out.push({ media: media || '(all)', selector: rule.selectorText, css: rule.style.cssText.slice(0, 160) });
                }
              };
              walk(rules, null);
            }
            return out;
          })(),
        };
      });
      console.log(`\n===== viewport ${width}px =====`);
      console.log(JSON.stringify(snap, null, 2));
    }
  } finally {
    if (browser) await browser.close();
    harness.server.closeAllConnections();
    harness.server.close();
  }
})().catch(error => { console.error('PROBE FALHOU:', error); process.exit(1); });
