'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright-core');
const {startLocalHttpServer}=require('./local-http-server');
test('large synthetic portfolio mounts only the active asset layout and survives breakpoint changes',async()=>{
  const harness=await startLocalHttpServer(path.resolve(__dirname,'..'));
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1366,height:768}});
    await page.goto(harness.url+'&testReadOnly=1');
    const report=await page.evaluate(()=>{
      S.assets=Array.from({length:200},(_,i)=>({id:'SCALE_'+i,ticker:'SYN'+i,name:'Posição sintética '+i,type:'Ação',qty:1,avg_price:10,current_price:11}));
      S.assetsSearch='';S.assetsFilterClasses=[];S.assetsClassFilter='all';S.assetsSectorFilter='all';S.assetsPerformanceFilter='all';
      const start=performance.now();go('ativos');
      return {renderMs:performance.now()-start,domNodes:document.querySelectorAll('*').length,desktopRows:document.querySelectorAll('.assets-table tbody tr').length,mobileCards:document.querySelectorAll('.asset-mobile-cards details').length};
    });
    const evidence=path.resolve(__dirname,'../.qa-state/mega19');fs.mkdirSync(evidence,{recursive:true});
    fs.writeFileSync(path.join(evidence,'assets-scale-'+(process.env.QA_SCALE_LABEL||'current')+'.json'),JSON.stringify(report,null,2));
    assert.equal(report.desktopRows,200);
    assert.equal(report.mobileCards,0,'desktop must not mount an invisible second portfolio');
    await page.setViewportSize({width:390,height:844});
    await page.waitForFunction(()=>document.querySelectorAll('.asset-mobile-cards details').length===200);
    assert.equal(await page.locator('.assets-table tbody tr').count(),0);
    assert.equal(await page.locator('.asset-mobile-cards details').count(),200);
    await page.setViewportSize({width:1366,height:768});
    await page.waitForFunction(()=>document.querySelectorAll('.assets-table tbody tr').length===200);
    assert.equal(await page.locator('.asset-mobile-cards details').count(),0);
  }finally{await browser.close();harness.server.closeAllConnections?.();await new Promise(resolve=>harness.server.close(resolve));}
});
