'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright-core');
const {startLocalHttpServer}=require('./local-http-server');

test('real dashboard boots while secondary screen modules are pending and routes recover after load',async()=>{
  const harness=await startLocalHttpServer(path.resolve(__dirname,'..'));
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  let release;
  const pending=new Promise(resolve=>{release=resolve;});
  try{
    const page=await browser.newPage();
    await page.route(/\/legacy\/js\/screens\/(assets|fixed-income)\.js$/,async route=>{await pending;await route.continue();});
    await page.goto(harness.url+'&testReadOnly=1',{waitUntil:'commit'});
    await page.waitForSelector('.test-mode-banner');
    assert.equal(await page.evaluate(()=>typeof ativos),'undefined');
    assert.equal(await page.evaluate(()=>S.tab),'dashboard');
    await page.evaluate(()=>go('ativos'));
    await page.getByRole('status').filter({hasText:'Carregando Ativos'}).waitFor();
    assert.equal(await page.evaluate(()=>S.tab),'ativos');
    release();
    await page.waitForFunction(()=>typeof ativos==='function' && !!document.querySelector('.assets-premium-shell'));
    assert.equal(await page.getByRole('status').filter({hasText:'Carregando Ativos'}).count(),0);
    await page.evaluate(()=>go('renda-fixa'));
    await page.waitForSelector('.premium-rf-page');
    assert.equal(await page.evaluate(()=>S.tab),'renda-fixa');
  }finally{
    release();
    await browser.close();
    harness.server.closeAllConnections?.();
    await new Promise(resolve=>harness.server.close(resolve));
  }
});
