'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {chromium}=require('playwright-core');
const {startLocalHttpServer}=require('./local-http-server');
const {applyV289VisualFixture}=require('./helpers/v289-visual-fixtures');
test('class filter excludes the master checkbox value and Todos restores all classes',async()=>{
  const harness=await startLocalHttpServer(path.resolve(__dirname,'..'));
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1366,height:768}});
    await page.goto(harness.url+'&testReadOnly=1');
    await applyV289VisualFixture(page);
    await page.evaluate(()=>go('ativos'));
    await page.getByRole('button',{name:/^Filtros /}).click();
    await page.getByRole('checkbox',{name:'FIIs',exact:true}).check();
    assert.deepEqual(await page.evaluate(()=>S.assetsFilterClasses),['FII']);
    assert.equal(await page.getByRole('checkbox',{name:'FIIs',exact:true}).evaluate(element=>document.activeElement===element),true,'filter rerender must preserve keyboard focus');
    await page.getByRole('checkbox',{name:'Todos os tipos',exact:true}).click();
    assert.deepEqual(await page.evaluate(()=>S.assetsFilterClasses),[]);
    assert.equal(await page.getByRole('checkbox',{name:'Todos os tipos',exact:true}).isChecked(),true);
    assert.ok(await page.getByText('QAAA3',{exact:true}).count()>0);
    assert.ok(await page.getByText('QAFI11',{exact:true}).count()>0);
    await page.keyboard.press('Escape');
    const toggle=page.getByRole('button',{name:/^Filtros /});
    assert.equal(await toggle.getAttribute('aria-expanded'),'false');
    assert.equal(await toggle.evaluate(element=>document.activeElement===element),true,'Escape returns focus to the filter trigger');
  }finally{
    await browser.close();harness.server.closeAllConnections?.();await new Promise(resolve=>harness.server.close(resolve));
  }
});
