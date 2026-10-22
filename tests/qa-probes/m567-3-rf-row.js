const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('../local-http-server');
const path = require('path');
(async () => {
  const h = await startLocalHttpServer(path.join(__dirname, '..', '..'));
  const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:' + String.fromCharCode(92) + 'Program Files' + String.fromCharCode(92) + 'Google' + String.fromCharCode(92) + 'Chrome' + String.fromCharCode(92) + 'Application' + String.fromCharCode(92) + 'chrome.exe', headless: true });
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  await p.goto(h.url, { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => typeof S !== 'undefined' && typeof go === 'function');
  await p.evaluate(() => { restoreLocalTestData(); fetchQuotes = async () => {}; });
  const out = await p.evaluate(() => {
    go('renda-fixa');
    const row = document.querySelector('.premium-rf-position-row');
    const dump = (el, d) => { const r = el.getBoundingClientRect(); return d + ' ' + (el.className||'').toString().slice(0,40) + ' h=' + Math.round(r.height) + ' | ' + (el.innerText||'').replace(/s+/g,' ').slice(0,45); };
    const lines = [dump(row, 0)];
    [...row.children].forEach(c => lines.push(dump(c, 1)));
    [...row.children].forEach(c => [...c.children].forEach(c2 => lines.push(dump(c2, 2))));
    return lines;
  });
  console.log(out.join(String.fromCharCode(10)));
  await b.close(); await new Promise(r => h.server.close(r));
})();
