const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const trustStart = html.indexOf('function dataTrustCenterTab');
const trustEnd = html.indexOf('function v257DataQualityCenter', trustStart);
const trustBlock = html.slice(trustStart, trustEnd > trustStart ? trustEnd : html.indexOf('function dataQualityTab', trustStart));

test('Confiabilidade carrega o módulo e está disponível na navegação', () => {
  assert.match(html, /portfolio-data-trust\.js\?v=v329-1/);
  assert.match(html, /\['confiabilidade','🛡️ Confiabilidade'\]/);
  assert.match(html, /S\.tab==='confiabilidade'\) return dataTrustCenterTab\(\)/);
  assert.match(html, /id="data-trust-title"/);
});

test('o centro expõe frescor, provenance, cloud e reconciliação factual', () => {
  assert.match(trustBlock, /Confiabilidade da carteira/);
  assert.match(trustBlock, /Cotações atuais/);
  assert.match(trustBlock, /Provenance/);
  assert.match(trustBlock, /Cloud sync/);
  assert.match(trustBlock, /Reconciliações disponíveis/);
  assert.match(trustBlock, /Nenhuma ausência é convertida em zero/);
  assert.doesNotMatch(trustBlock, /score|compre|venda|rebalanceie|oportunidade|melhor|pior/i);
});

test('o centro não contém caminho de escrita ou confirmação', () => {
  assert.doesNotMatch(trustBlock, /save\(|setItem\(|setDoc\(|updateDoc\(|addDoc\(|deleteDoc\(|confirm\(|importar|realizar evento/i);
});

test('o centro mostra cobertura institucional e confiança do valor sem afirmar verificação implícita', () => {
  assert.match(trustBlock, /dataTrustCoverageRow\('Instituição',model\.coverage\?\.institution\)/);
  assert.match(trustBlock, /Confiança do valor:/);
  assert.match(html, /AVAILABLE:'Disponível; verificação não informada'/);
  assert.doesNotMatch(html, /VERIFIED:'Verificada'/);
  assert.match(html, /value===null\|\|value===undefined\|\|value===''\?null/);
});

test('reconciliações usam o período selecionado e expõem cobertura parcial', () => {
  assert.match(html, /transactionCount:reports\.aportesCount/);
  assert.match(html, /dividendEventCount:reports\.proventosCount/);
  assert.match(html, /timelineIncomeEventCount/);
  assert.match(html, /PARTIAL_COVERAGE:'Cobertura parcial'/);
  assert.match(html, /item\?\.reason/);
});

test('mobile oferece acesso à nova área', () => {
  assert.match(html, /go\('confiabilidade'\)/);
  assert.match(html, /min-height:44px/);
  assert.match(html, /data-trust-page/);
});

test('alocação descritiva expõe instituição explícita, denominador e data-base', () => {
  assert.match(html, /institution:String\(asset\?\.institution\|\|asset\?\.broker\|\|asset\?\.brokerage\|\|asset\?\.custodian/);
  assert.match(html, /issuer:String\(asset\?\.fixed_issuer\|\|asset\?\.issuer/);
  assert.match(html, /Por instituição identificada/);
  assert.match(html, /Cobertura institucional:/);
  assert.match(html, /emissor não é usado como substituto/);
  assert.match(html, /data-allocation-valuation-as-of/);
  assert.match(html, /Base usada nos percentuais exibidos/);
});
