'use strict';

const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const PersistenceCore=require('../persistence-core');
const FinanceCore=require('../finance-core');
const Mapping=require('../package1-portfolio-schema-mapping');

function syntheticV2(){
  const batch='SYN_PACKAGE1_BATCH';
  const positions=Array.from({length:35},(_,index)=>({
    document_id:`SYN_POSITION_${index+1}`,schema_version:2,custodian_id:'SYN_CUSTODIAN',
    asset_id:`SYN_ASSET_${index+1}`,asset_type:index<31?'RV_ACAO':'RF',quantity:1,
    current_value:index===0?100:index===1?28:index===31?4:0,as_of:'2026-10-10',
    average_cost:null,average_cost_status:'UNKNOWN',cost_basis_value:null,cost_basis_status:'UNKNOWN',
    cost_method:null,provenance:{source_id:`SYN_SOURCE_${index+1}`},source_ids:[`SYN_SOURCE_${index+1}`],
    reconciliation_status:'PARTIAL',import_batch_id:batch,
    created_at:'2026-10-14T12:00:00.000Z',updated_at:'2026-10-14T12:00:00.000Z'
  }));
  const snapshot={document_id:'SYN_SNAPSHOT',snapshot_id:'SYN_SNAPSHOT',schema_version:1,custodian_id:'SYN_CUSTODIAN',as_of:'2026-10-10',
    rv_official:130,rf_official:10,total_official:140,rv_detail_sum:128,rf_detail_sum:4,
    detail_total:132,rv_gap:2,rf_gap:6,total_gap:8,reconciliation_status:'PARTIAL',
    provenance:{source_id:'SYN_OFFICIAL_SOURCE'},import_batch_id:batch};
  return Mapping.buildPortfolioFieldUpdate({mode:'LOCAL_DRY_RUN_ONLY',import_batch_id:batch,
    records:[...positions.map(data=>({collection:'positions',data})),{collection:'account_snapshots',data:snapshot}]})[Mapping.FIELD];
}

class Node{
  constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.attributes={};this.className='';this.textContent='';this.id='';}
  append(...items){this.children.push(...items);}
  prepend(item){this.children.unshift(item);}
  setAttribute(name,value){this.attributes[name]=value;}
  querySelector(selector){return selector==='.wrap'?this.wrap:null;}
  remove(){this.removed=true;}
  get textContent(){return this._textContent+this.children.map(child=>child.textContent).join(' ');}
  set textContent(value){this._textContent=String(value);}
}

function makeUi(){
  const source=fs.readFileSync(path.join(__dirname,'../legacy/js/ui/package1-portfolio-readonly.js'),'utf8');
  const document={createElement:tag=>new Node(tag)};
  const context={document,FinanceCore,Intl,globalThis:null};
  context.globalThis=context;
  vm.runInNewContext(source,context,{filename:'package1-portfolio-readonly.js'});
  return {ui:context.Package1PortfolioReadonlyUi,document};
}

test('production read-only summary renderer uses the real V2 view and separates official from partial detail',()=>{
  const value=syntheticV2();
  const parsed=Mapping.readEmbeddedPackage1({package1_v2:value});
  const {ui}=makeUi();
  for(const route of ['dashboard','patrimonio','ativos','renda-fixa','rentabilidade','irpf','dividendos','metas','configuracoes']){
    const root=new Node('main');
    root.wrap=new Node('div');
    assert.equal(ui.mount(root,route,parsed.view),true,route);
    const panel=root.wrap.children[0];
    assert.equal(panel.dataset.reconciliation,'PARTIAL');
    assert.match(panel.children[0].textContent,/Posição oficial/);
    const text=panel.children.map(child=>child.textContent).join(' ');
    assert.match(text,/Detalhe disponível/);
    assert.match(text,/divergências de identidade ou quantidade/);
    assert.equal(root.wrap.children.length,1,'renderer must not duplicate position rows');
  }
});

test('legacy parse of production-shaped document does not persist or zero-fill embedded V2',()=>{
  const document={wallets:[],assets:[{id:'SYN_LEGACY',qty:2}],package1_v2:syntheticV2()};
  const legacy=PersistenceCore.parseStoredState(PersistenceCore.serializeStoredState(document));
  assert.equal(legacy.assets[0].qty,2);
  assert.equal(Object.hasOwn(legacy,'package1_v2'),false);
  const parsed=Mapping.readEmbeddedPackage1(document);
  assert.equal(parsed.view.snapshot.total_official,140);
  assert.equal(parsed.view.positions[0].average_cost,null);
});
