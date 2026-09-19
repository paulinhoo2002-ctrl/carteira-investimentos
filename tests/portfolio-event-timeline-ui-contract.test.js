const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8');
test('Relatórios carrega o módulo versionado e renderiza a timeline read-only',()=>{
  assert.match(html,/portfolio-event-timeline\.js\?v=v228-1/);
  assert.match(html,/v228TimelinePanel\(\)/);
  assert.match(html,/Linha do tempo e calendário/);
  assert.match(html,/sem previsão ou realização automática/);
});
test('integração do detalhe mantém a mesma seção factual por ativo',()=>{
  assert.match(html,/v228AssetTimelineSection\(asset\)/);
  assert.match(html,/Histórico factual, incluindo referências separadas do realizado/);
});
test('V228 não adiciona controles de mutação ao painel',()=>{
  const block=html.slice(html.indexOf('function v228TimelinePanel'),html.indexOf('function buildReportRows'));
  assert.doesNotMatch(block,/save\(|firestore|localStorage|confirmar|realizar evento/i);
});
