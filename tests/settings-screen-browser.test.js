'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');

const root = path.join(__dirname, '..');
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

test('settings and dashboard load extracted renderers in the synthetic read-only browser', async () => {
  const harness = await startLocalHttpServer(root);
  let browser;
  try {
    browser = await chromium.launch({ executablePath: chrome, headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

    await page.goto(harness.url.replace('?testMode=1', '?testMode=1&testReadOnly=1'), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof settingsTab === 'function' && typeof render === 'function');
    await page.evaluate(() => { S.tab = 'settings'; render(); });

    assert.match(await page.locator('#root').innerText(), /Preferências e administração/);
    assert.equal(await page.getByRole('heading',{level:1,name:'Preferências e administração',exact:true}).count(),1);
    assert.match(await page.locator('#root').innerText(), /Bloqueado no modo somente leitura/);
    for (const theme of ['light','dark']) {
      await page.evaluate(theme=>applyTheme(theme),theme);
      await page.waitForTimeout(250);
      const contrast=await page.evaluate(()=>{
        const channels=color=>(color.match(/[\d.]+/g)||[]).slice(0,3).map(Number);
        const luminance=rgb=>rgb.map(value=>{const c=value/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;}).reduce((sum,value,i)=>sum+value*[.2126,.7152,.0722][i],0);
        const section=document.querySelector('.premium-settings-section');
        const stops=[...getComputedStyle(section).backgroundImage.matchAll(/rgba?\([^)]*\)/g)].map(match=>luminance(channels(match[0])));
        return [...section.querySelectorAll('.premium-settings-section-title,.premium-settings-row-label,.premium-settings-row-desc')].map(element=>{
          const fg=luminance(channels(getComputedStyle(element).color));
          return Math.min(...stops.map(bg=>(Math.max(fg,bg)+.05)/(Math.min(fg,bg)+.05)));
        });
      });
      assert.ok(contrast.length>0 && contrast.every(ratio=>ratio>=4.5),theme+' settings text must contrast against both gradient stops');
      const reading=await page.evaluate(()=>({
        microtext:[...document.querySelectorAll('.premium-settings-page *')].filter(element=>element.childElementCount===0 && element.textContent.trim() && element.getBoundingClientRect().height>0 && parseFloat(getComputedStyle(element).fontSize)<12).length,
        smallButtons:[...document.querySelectorAll('.premium-settings-page button')].filter(element=>element.getBoundingClientRect().height>0 && element.getBoundingClientRect().height<44).length,
      }));
      assert.equal(reading.microtext,0,theme+' settings must not use functional microtext');
      assert.equal(reading.smallButtons,0,theme+' settings buttons must preserve touch targets');
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map(element => element.id);
      return ids.filter((id, index) => ids.indexOf(id) !== index);
    }), []);

    await page.evaluate(() => { S.tab = 'dashboard'; render(); });
    assert.match(await page.locator('#root').innerText(), /Visão consolidada/);
    assert.match(await page.locator('#root').innerText(), /PATRIMÔNIO ATUAL/);
    assert.match(await page.locator('#root').innerText(), /Alocação/);
    assert.deepEqual(await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map(element => element.id);
      return ids.filter((id, index) => ids.indexOf(id) !== index);
    }), []);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);

    await page.setViewportSize({ width: 1366, height: 768 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    harness.server.closeAllConnections?.();
    await new Promise(resolve => harness.server.close(resolve));
  }
});
