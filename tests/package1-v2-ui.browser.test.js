'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright-core');
const { startLocalHttpServer } = require('./local-http-server');

const ROOT = path.resolve(__dirname, '..');
const ROUTES = ['dashboard','patrimonio','ativos','renda-fixa','rentabilidade','irpf','dividendos'];
const exactPath = path.join(ROOT,'.qa-state/package1/ui-synthetic-contract.json');
const defaults = { rvOfficial:110,rfOfficial:20,rvDetail:100,rfDetail:15 };

function fixture(amounts=defaults){
  const date='2026-10-10', batch='SYN_UI_BATCH', custodian='SYN_CUSTODIAN';
  const rvDetail=Math.round(amounts.rvDetail*100), rfDetail=Math.round(amounts.rfDetail*100);
  const rvParts=[...Array(30)].map(()=>Math.floor(rvDetail/31));
  rvParts.push(rvDetail-rvParts.reduce((sum,n)=>sum+n,0));
  const rfParts=[...Array(3)].map(()=>Math.floor(rfDetail/4));
  rfParts.push(rfDetail-rfParts.reduce((sum,n)=>sum+n,0));
  const positions=[...rvParts,...rfParts].map((cents,i)=>({
    document_id:`SYN_POSITION_${i+1}`,schema_version:2,custodian_id:custodian,
    asset_id:`SYN_ASSET_${i+1}`,asset_type:i<31?'RV_ACAO':'RF',quantity:1,current_value:cents/100,
    as_of:date,average_cost:null,average_cost_status:'UNKNOWN',
    cost_basis_value:i<25?1:null,cost_basis_status:i<25?'DERIVED':'UNKNOWN',cost_method:i<25?'FIFO':null,
    provenance:{source_id:`SYN_SOURCE_${i+1}`},source_ids:[`SYN_SOURCE_${i+1}`],
    reconciliation_status:'PARTIAL',import_batch_id:batch,
    created_at:'2026-10-14T12:00:00.000Z',updated_at:'2026-10-14T12:00:00.000Z',
    lent_shares:i<4?1:0
  }));
  const snapshot={document_id:'SYN_SNAPSHOT',snapshot_id:'SYN_SNAPSHOT',schema_version:1,
    custodian_id:custodian,as_of:date,rv_official:amounts.rvOfficial,rf_official:amounts.rfOfficial,
    total_official:Math.round((amounts.rvOfficial+amounts.rfOfficial)*100)/100,
    rv_detail_sum:amounts.rvDetail,rf_detail_sum:amounts.rfDetail,
    detail_total:Math.round((amounts.rvDetail+amounts.rfDetail)*100)/100,
    rv_gap:Math.round((amounts.rvOfficial-amounts.rvDetail)*100)/100,
    rf_gap:Math.round((amounts.rfOfficial-amounts.rfDetail)*100)/100,
    total_gap:Math.round((amounts.rvOfficial+amounts.rfOfficial-amounts.rvDetail-amounts.rfDetail)*100)/100,
    reconciliation_status:'PARTIAL',provenance:{source_id:'SYN_OFFICIAL'},import_batch_id:batch};
  return {positions,snapshot};
}

test('Package 1 V2 synthetic preview uses actual routes, stays read-only and preserves legacy path', async()=>{
  const server=await startLocalHttpServer(ROOT);
  const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.name));
  page.on('console',message=>{if(message.type()==='error')errors.push('console');});
  const origin=new URL(server.url).origin;
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  try{
    await page.goto(server.url+'&testReadOnly=1',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>typeof S!=='undefined'&&!!document.querySelector('.test-mode-banner'));
    const originalState=await page.evaluate(()=>JSON.stringify({assets:S.assets,aportes:S.aportes,proventos:S.proventos,rfEvents:S.rfEvents}));
    for(const route of ROUTES){
      await page.evaluate(route=>go(route),route);
      assert.equal(await page.locator('.package1-v2-qa').count(),0,'legacy route must not show V2');
    }
    await page.addScriptTag({path:path.join(ROOT,'legacy/js/ui/package1-v2-qa.js')});
    const cases=[['portable',defaults]];
    if(fs.existsSync(exactPath)) cases.push(['local-exact',JSON.parse(fs.readFileSync(exactPath,'utf8'))]);
    for(const [label,amounts] of cases){
      const data=fixture(amounts);
      assert.equal(data.positions.length,35);
      assert.equal(data.positions.filter(item=>item.lent_shares===1).length,4);
      assert.equal(data.positions.filter(item=>item.cost_basis_status==='DERIVED').length,25);
      assert.equal(data.positions.filter(item=>item.cost_basis_status==='UNKNOWN').length,10);
      assert.equal(new Set(data.positions.map(item=>item.document_id)).size,35,'loaned ownership must appear once');
      assert.equal(Math.round(data.positions.filter(item=>item.asset_type.startsWith('RV')).reduce((sum,item)=>sum+item.current_value,0)*100),Math.round(amounts.rvDetail*100));
      await page.evaluate(data=>window.Package1V2Qa.setInput(data.positions,data.snapshot),data);
      for(const width of [390,430,768,1366,1920]){
        await page.setViewportSize({width,height:width<=430?844:900});
        for(const theme of ['dark','light']){
          await page.evaluate(theme=>applyTheme(theme),theme);
          for(const route of ROUTES){
          await page.evaluate(route=>go(route),route);
          const panel=page.locator('.package1-v2-qa');
          await panel.waitFor();
          assert.equal(await panel.getAttribute('data-route'),route);
          assert.equal(await panel.getAttribute('data-reconciliation'),'PARTIAL');
          const text=await panel.innerText();
          for(const value of [data.snapshot.total_official,data.snapshot.detail_total,data.snapshot.total_gap])
            assert.ok(text.includes(new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value)),`${label}/${route}: amount missing`);
          assert.match(text,/custo médio —/i);
          assert.doesNotMatch(text,/preço médio certificado|resultado R\$ 0,00|ganho R\$/i);
          if(route==='rentabilidade')assert.match(text,/P&L parcial.*indisponível/);
          if(route==='irpf')assert.match(text,/Evidência FIFO derivada não é preço médio fiscal/);
          if(route==='irpf')assert.match(text,/CERTIFIED 0, DERIVED 25, MANUAL 0, UNKNOWN 10/);
          if(route==='dividendos')assert.match(text,/Recebido — · esperado —/);
          if(route==='ativos')assert.equal((text.match(/posição emprestada incluída uma vez/g)||[]).length,4);
          assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${label}/${route}: overflow`);
          if(label==='local-exact' && ((width===390 && theme==='dark' && route==='dashboard') || (width===1366 && theme==='light' && route==='renda-fixa'))){
            const out=path.join(ROOT,'.qa-state/package1',`ui-${route}-${width}.png`);
            await page.screenshot({path:out,fullPage:true});
          }
        }
        }
      }
      const failures=[
        [data.positions,null], [[],data.snapshot],
        [[{...data.positions[0],current_value:null},...data.positions.slice(1)],data.snapshot],
        [[{...data.positions[0],schema_version:1},...data.positions.slice(1)],data.snapshot],
        [[{...data.positions[0],average_cost:0},...data.positions.slice(1)],data.snapshot]
      ];
      for(const [positions,snapshot] of failures){
        assert.equal(await page.evaluate(({positions,snapshot})=>{
          try{window.Package1V2Qa.setInput(positions,snapshot);return 'accepted';}catch{return 'rejected';}
        },{positions,snapshot}),'rejected');
        await page.evaluate(()=>go('dashboard'));
        assert.equal(await page.locator('.package1-v2-qa').count(),0,'bad payload must not retain prior preview');
      }
      const zero=fixture(amounts);
      zero.positions[1].current_value=Math.round((zero.positions[1].current_value+zero.positions[0].current_value)*100)/100;
      zero.positions[0].current_value=0;
      await page.evaluate(data=>window.Package1V2Qa.setInput(data.positions,data.snapshot),zero);
      await page.evaluate(()=>go('ativos'));
      const zeroText=await page.locator('.package1-v2-qa').innerText();
      assert.ok(zeroText.includes(`SYN_ASSET_1 · atual ${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(0)} · custo médio — · resultado —`));
    }
    assert.equal(await page.evaluate(()=>JSON.stringify({assets:S.assets,aportes:S.aportes,proventos:S.proventos,rfEvents:S.rfEvents})),originalState,'V2 preview must not mutate legacy financial state');
    await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
    await page.evaluate(data=>window.Package1V2Qa.setInput(data.positions,data.snapshot),fixture());
    await page.evaluate(()=>go('dashboard'));
    const a11y=await page.evaluate(async()=>{
      const result=await axe.run(document.querySelector('.package1-v2-qa'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});
      return result.violations.filter(item=>['critical','serious'].includes(item.impact)).map(item=>({id:item.id,targets:item.nodes.map(node=>node.target)}));
    });
    assert.deepEqual(a11y,[]);
    assert.deepEqual(errors,[]);
  }finally{
    await browser.close();
    server.server.closeAllConnections?.();
    await new Promise(resolve=>server.server.close(resolve));
  }
});
