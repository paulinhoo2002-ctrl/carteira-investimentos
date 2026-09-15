const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { startLocalHttpServer } = require('./local-http-server');

function browserPath(){
  return [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean).find(candidate=>{ try{ fs.accessSync(candidate); return true; }catch{return false;} });
}

const cases=[
  {label:'variable', route:'ativos', final:'asset-detail-variable', type:'variavel'},
  {label:'fixed-income', route:'renda-fixa', final:'asset-detail-fixed-income', type:'rf'},
];
const viewports=[
  {width:1366,height:768,suffix:'1366'},
  {width:390,height:844,suffix:'390'},
];

for(const item of cases){
  for(const viewport of viewports){
    test(`V84 detalhe ${item.label} ${viewport.suffix}`,{skip:!browserPath(),skipReason:'Chrome/Edge ausente; smoke browser dedicado executa apos provisionamento do navegador'},async()=>{
      const executablePath=browserPath();
      const harness=await startLocalHttpServer(path.join(__dirname,'..'));
      const {chromium}=await import('playwright-core');
      const browser=await chromium.launch({executablePath,headless:true});
      const errors=[];
      const failures=[];
      try{
        const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},hasTouch:viewport.width<=430,isMobile:viewport.width<=430});
        const page=await context.newPage();
        page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
        page.on('pageerror',error=>errors.push(`pageerror: ${error.message}`));
        page.on('requestfailed',request=>failures.push(request.url()));
        await page.goto(harness.url,{waitUntil:'networkidle'});
        await page.evaluate(route=>go(route),item.route);
        if(item.type!=='rf'){
          const group=page.locator('.ag').first();
          if(await group.count() && !(await group.getAttribute('open'))) await group.locator(':scope > summary').click();
          const card=page.locator('.asset-premium-card:visible').first();
          if(viewport.width<=430 && await card.count() && !(await card.getAttribute('open'))) await card.locator(':scope > summary').click();
        }else await page.waitForSelector('.premium-rf-position-row',{timeout:6000});
        const trigger=page.locator('.asset-detail-link:visible').first();
        if(await trigger.count()) await trigger.click();
        else {
          const assetId=await page.evaluate(()=>String((S.assets||[]).find(asset=>!isRendaFixaAsset(asset))?.id||''));
          assert.ok(assetId,'ativo variavel de fixture ausente');
          await page.evaluate(id=>openAssetDetail(id),assetId);
        }
        await page.waitForSelector('.asset-detail-page',{timeout:3000});
        const state=await page.evaluate(()=>({
          title:document.querySelector('#asset-detail-title')?.textContent.trim()||'',
          tabs:[...document.querySelectorAll('.asset-detail-tab')].map(el=>el.textContent.trim()),
          cards:document.querySelectorAll('.asset-detail-kpi').length,
          back:document.querySelector('.asset-detail-back')?.textContent.trim()||'',
          overflow:document.documentElement.scrollWidth>window.innerWidth,
          financialSelectors:[...document.querySelectorAll('.asset-detail-kpi-value')].map(el=>el.textContent.trim()),
        }));
        assert.ok(state.title,'titulo do detalhe ausente');
        assert.equal(state.cards,4,'detalhe deve ter quatro metricas principais');
        assert.match(state.back,/Voltar/);
        assert.ok(state.tabs.includes('Visão geral'));
        assert.ok(state.tabs.includes('Valuation'));
        assert.equal(state.overflow,false,`overflow em ${viewport.suffix}`);
        await page.screenshot({path:path.join('.qa-state','v84-ui',`${item.final}-${viewport.suffix}-cycle-1.png`),fullPage:true});
        await page.locator('.asset-detail-tab').filter({hasText:'Valuation'}).click();
        assert.ok(await page.locator('.asset-detail-page').isVisible(),'aba Valuation indisponivel');
        await page.locator('.asset-detail-back').click();
        await page.waitForSelector(item.type==='rf'?'.premium-rf-position-row':'.assets-premium-shell',{timeout:3000});
        assert.equal(await page.locator('.asset-detail-page').count(),0,'voltar nao fechou detalhe');
        const secondTrigger=page.locator('.asset-detail-link:visible').first();
        if(await secondTrigger.count()) await secondTrigger.click();
        else {
          const assetId=await page.evaluate(()=>String((S.assets||[]).find(asset=>!isRendaFixaAsset(asset))?.id||''));
          await page.evaluate(id=>openAssetDetail(id),assetId);
        }
        await page.waitForSelector('.asset-detail-page',{timeout:3000});
        await page.screenshot({path:path.join('.qa-state','v84-ui',`${item.final}-${viewport.suffix}.png`),fullPage:true});
        await context.close();
      }finally{
        await browser.close();
        harness.server.close();
      }
      assert.deepEqual(errors,[],`console/pageerror: ${errors.join(' | ')}`);
      assert.deepEqual(failures,[],`request failures: ${failures.join(' | ')}`);
    });
  }
}
