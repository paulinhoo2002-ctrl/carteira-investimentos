// M862-M879 — regressão das melhorias de UX: CTA no dashboard vazio, ESC no modal de movimentação, title por rota.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('M877 dashboard vazio expõe CTA contextual com ações reais', () => {
  // CTA condicional à carteira vazia, logo após o painel package2 (ordem KPIs→package2 preservada por contrato)
  assert.match(html, /package2ExecutivePanel\(!dashboardHasEconomicCertification\(data\?\.portfolioEconomicResult\)\)\}\s*\$\{!S\.assets\.length \? `<div class="dashboard-empty-cta"/);
  assert.match(html, /Cadastrar primeiro ativo/);
  assert.match(html, /go\('ativos'\)">➕/);
  assert.match(html, /go\('importacao'\)">⬆/);
  assert.match(html, /role="region" aria-label="Primeiros passos"/);
});

test('M878 modal de movimentação fecha por ESC apenas sem dados não salvos', () => {
  assert.match(html, /function quickMovementEscape\(e\)\{/);
  assert.match(html, /e\.key!=='Escape' \|\| !S\.quickMovementOpen\) return;/);
  // registro e remoção do listener emparelhados
  const opened = html.indexOf('function openQuickMovement');
  const closed = html.indexOf('function closeQuickMovement');
  assert.ok(opened > 0 && closed > 0);
  const openBody = html.slice(opened, opened + 400);
  const closeBody = html.slice(closed, closed + 400);
  assert.match(openBody, /document\.addEventListener\('keydown', quickMovementEscape\)/);
  // M903 final: baseline = snapshot DIFERIDO do draft (350ms pós-render, cobre prefills);
  // flag __qmUserEdited via listener de input bloqueia ESC e a re-captura tardia; guards
  // de VM (window/document/setTimeout) — os testes V320 executam open/close sem DOM.
  assert.match(html, /window\.__qmBaselineDraft=null;\s*\r?\n\s*window\.__qmUserEdited=false;/);
  assert.match(html, /overlay\.addEventListener\('input', \(\)=>\{ window\.__qmUserEdited=true; \}/);
  assert.match(html, /setTimeout\(\(\)=>\{ if\(!window\.__qmUserEdited && S\.quickMovementOpen && S\.quickMovementDraft\) window\.__qmBaselineDraft=JSON\.stringify\(S\.quickMovementDraft\); \}, 350\)/);
  assert.match(html, /if\(userEdited\) return;/);
  assert.match(html, /JSON\.stringify\(S\.quickMovementDraft\)!==baseline\) return;/);
  assert.match(closeBody, /document\.removeEventListener\('keydown', quickMovementEscape\)/);
  assert.match(html, /window\.__qmBaselineDraft=null; window\.__qmUserEdited=false; \}/);
  assert.doesNotMatch(html, /__qmBaseline=/, 'baseline DOM antigo removido');
  assert.doesNotMatch(html, /requestAnimationFrame\(\(\)=>\{ window\.__qmBaseline/);
  // baseline NUNCA em S (não persistir)
  assert.doesNotMatch(html, /S\.__quickMovementBaseline/);
});

test('M879 título do navegador acompanha a rota ativa', () => {
  assert.match(html, /const routeTitleMap=\{dashboard:'Resumo'/);
  assert.match(html, /document\.title=\(\(routeTitleMap\[S\.tab\]\|\|'Carteira'\)\+' · Carteira de Investimentos'\);/);
  // title estático inicial preservado como fallback de primeiro carregamento
  assert.match(html, /<title>📈 Carteira de Investimentos<\/title>/);
  // mapa cobre as rotas principais
  for (const r of ["dashboard:'Resumo'", "ativos:'Ativos'", "dividendos:'Dividendos'", "'renda-fixa':'Renda Fixa'", "irpf:'IRPF'", "settings:'Configurações'"]) {
    assert.ok(html.includes(r), 'mapa deve conter ' + r);
  }
});
