# Fase 1 — Fundação e Indicadores: handoff dos Lotes A–C (2026-11-08)

Branch `fundacao/fase1-indicadores` (base V20 `d62fdc7`). Commits: `cb0d0eb` (Lote A, auditoria), `a4d017c` (Lote B, F-03/F-04). **Lote C: alterações locais, sem commit.** Sem push/merge/rebase/cherry-pick/reset/clean/deploy. Dados 100% sintéticos. `preview-10-10.html` segue deletado; 15 stashes e 17 worktrees intactos.

## Achados e estado

| ID | Tema | Estado |
|---|---|---|
| F-01 | Ativos × Dashboard: capital aplicado | **Corrigido (C5)**: "Total investido" aparece quando a base aplicada é completa (regra = `cx().appliedComplete`, teste de não divergência); valor atual/resultado/rentabilidade seguem "—" com motivo e cobertura ("indisponível em N de M ativo(s)") |
| F-02 | "Valor investido" parcial em destaque | **Corrigido (C5)**: selo "Parcial" + explicação |
| F-03/F-04 | Variação diária, `change` desconhecido | Corrigido no Lote B (`a4d017c`) |
| F-05 | Precisão de quantidade | **Corrigido (C7)**: `formatQuantity` (pt-BR, até 4 casas sem zeros à direita; cripto 8; "<0,0001" em vez de "0"; valor armazenado intacto) em 12 pontos de exibição |
| F-06 | R$ 0,00 com cobertura desconhecida | **Corrigido (C6)**: YTD/12M do bloco de inteligência de renda mostram "—" e "sem registros · cobertura desconhecida" quando a cobertura não é completa |
| F-07 | PM/Preço atual nos rankings | Lote D (visual) |
| F-08 | Monte Carlo não reprodutível | **Testes criados (C9)**, metodologia intacta (semente mulberry32; fórmula fechada com volatilidade ~0; propriedades) |
| F-09 | Percentual com ponto | **Corrigido (C8)**: `fmtP` e ~116 pontos de texto em pt-BR; CSS/dados/exportações intactos; `++` de Patrimônio removido |
| F-10 | CSP bloqueava brapi | **Corrigido (C2)**: `api.brapi.com.br` → `brapi.dev` (index.html meta, vercel.json ×2, servidor de teste); testado no navegador com a CSP aplicada |
| F-11 | Proxy Yahoo fabricava 0% | **Corrigido (C1)** em `api/yahoo-quote.js` (sem deploy) |
| F-12 | Monte Carlo: `\|\| 0.10` trata zero como ausente | **PENDÊNCIA FINANCEIRA BLOQUEANTE** (teste `todo`); hoje a tela passa valores fixos |
| F-13 | Monte Carlo: `Math.random()===0` ⇒ Infinity | **PENDÊNCIA FINANCEIRA BLOQUEANTE** (teste `todo`; ~2^-53 por sorteio) |

## Pendências financeiras BLOQUEANTES para a versão final (não resolvidas)

- **F-12** (`analytics-passive-income-projection.js`: `params.expectedReturn || 0.10`, `volatility || 0.15`, `years || 10`): um retorno esperado ou volatilidade igual a **zero** é trocado pelo padrão. Hoje a tela passa valores fixos, mas o contrato do módulo trata zero como ausente (viola "zero verdadeiro ≠ ausência").
- **F-13** (`analytics-passive-income-projection.js:222` e `analytics-wealth-goals.js:90`): `Math.random() === 0` ⇒ `log(0)` ⇒ `Infinity` ⇒ percentis nulos e probabilidade 100%. Probabilidade ~2^-53 por sorteio, mas o resultado seria inválido.
- Ambos têm teste `todo` (descrevem o comportamento correto e hoje falham sem quebrar a suíte). **Devem ser corrigidos, com teste e decisão explícita sobre a metodologia, antes da versão final** (planejados no Lote D).

## Diferenças financeiras/visuais intencionais em relação à referência (`origin/main`)

1. Variação diária sobre o fechamento anterior (Lote B).
2. Ativos (parcial): "Total investido" visível quando o capital aplicado é completo (R$ 95.982,00 na fixture parcial).
3. Dashboard: "Valor investido" com selo "Parcial" quando a base aplicada é parcial.
4. Dividendos: YTD/12M "—" (não "R$ 0,00") com cobertura desconhecida.
5. Quantidades em pt-BR com até 4 casas (antes 2, 3 ou 4 conforme a tela; `toFixed(4)` usava ponto).
6. Percentuais com vírgula; o PDF de relatório (preview e `downloadExecutivePdf`, que usa `fmtP` em 2 pontos) também segue pt-BR — é texto lido pelo usuário. **Exportações estruturadas não mudaram**: CSV e JSON de relatórios (`complete`, `assets`, `proventos`, `fixed`, `patrimony`, `audit`) e CSV do IRPF (26 combinações, completo e parcial) são idênticos byte a byte ao HEAD e a `origin/main`; `tests/fase1c-export-integrity.test.js` fixa os hashes (origem: `origin/main`). O PDF em si não é comparado byte a byte (limitação).
7. Proxy Yahoo: variação `null` quando não há preço do pregão e fechamento anterior; zero informado/verdadeiro preservado.
8. CSP: domínio da brapi.

**Nada altera** `cx()` (tC/tI/tG/tGP), proventos, matriz anual, ranking por ativo, renda fixa, persistência, Finance Core, `S.quotes` (não persistido) ou exportações CSV/JSON/backup.

## Arquivos

Alterados: `index.html`, `api/yahoo-quote.js`, `vercel.json`, `package.json`, `tests/local-http-server.js` (CSP), 15 testes migrados para o resolvedor de Chrome, `tests/security-csp-headers.test.js`, `tests/fixed-income-total-return-ui.test.js` (fmtP com vírgula), `tests/v289-visual-regression.test.js` (regra F-01), `tests/fase1a-financial-equivalence.test.js`, `tests/fase1b-daily-variation.test.js`.
Novos: `tests/helpers/chrome-path.js`, `tests/helpers/fase1-snapshot.js`, `tests/fixtures/fase1a-golden.json`, `scripts/qa/fase1a-golden.js`, `scripts/verify.js`, `tests/chrome-path-helper.test.js`, `tests/api-yahoo-quote.test.js`, `tests/csp-brapi-fallback.browser.test.js`, `tests/fase1a-golden.test.js`, `tests/fase1c-indicator-states.test.js`, `tests/fase1c-br-format.test.js`, `tests/fase1c-monte-carlo.test.js`, `tests/fase1c-export-integrity.test.js` (+ `tests/fixtures/fase1c-export-hashes.json`), `tests/fase1-registration.test.js`.

## Automação

- `npm test` agora termina com `npm run test:fase1` (chrome-path, proxy, CSP, golden 1a, 1b, 1c × 3). **1342 testes** (antes 1271).
- `npm run verify` (≈30 s): build, finance, persistence, backup-restore, load, roundtrip, extraction, performance, fase1.
- `npm run verify:full`: `npm test`, modern, `qa:all`, regressão visual e a comparação ao vivo `origin/main` × árvore atual (`npm run test:fase1a-baseline`).
- O golden (`tests/fixtures/fase1a-golden.json`) vem da **referência** (`origin/main @ f8fef82`), regenerável com `node scripts/qa/fase1a-golden.js --baseline origin/main`; relógio, locale (`pt-BR`) e fuso (`America/Sao_Paulo`) congelados. Diferenças intencionais (F-01) listadas no próprio golden.
- `ci.yml` **não foi alterado** (roda `npm test` em ubuntu com `CHROME_PATH`). **O CI Linux NÃO está validado**: nenhum teste foi executado em Linux real nem no GitHub Actions. O que existe é prova indireta e insuficiente para declarar validação: resolvedor de Chrome testado por unidade com plataformas simuladas, testes novos sem caminhos de Windows e golden estável sob outro `TZ`. Para validar de verdade é preciso uma execução real do workflow (ex.: PR/branch no GitHub Actions, que exige push e, portanto, autorização). Risco aberto: métricas de fonte do Linux podem alterar testes de layout antigos (matriz anual sem rolagem).
- Todos os testes novos fazem parte do `npm test`: `tests/fase1-registration.test.js` falha se um teste da Fase 1 existir em `tests/` sem estar em `test:fase1` e se o script `test` deixar de chamar `test:fase1`.

## Validação (Lote C)

- `npm run verify`: 9 gates PASS (≈30 s; fase1 = 69 passam, 2 `todo`).
- `npm run verify:full`: 5 gates PASS — `npm test` 1340 passam/0 falham/2 `todo` (1342 testes; eram 1271), modern 786, qa:all 25, regressão visual 39, comparação ao vivo `origin/main` 23. As execuções de `npm test` anteriores falharam apenas por `page.goto` de 5 s (infra) ou por contratos que o próprio lote mudou (corrigidos).

- Zoom real do navegador (125% e 150%), método: `partition.default_zoom_level` gravado no `Preferences` de um perfil novo do Chrome (`devicePixelRatio` 1,25/1,5 e `innerWidth` 1093/911, 1536/1280, 312/260 confirmados). **Não** foi `deviceScaleFactor` nem viewport menor. 6 janelas × 2 temas × 3 estados × 18 rotas: 0 overflow horizontal; axe (dashboard, ativos, dividendos) 0 violações.
- Matriz 11 larguras × 10 telas × 2 temas + privacidade: 240 checagens, 0 problemas.
- Privacidade (valores ocultos, 18 rotas × completo/parcial): 0 "R$" e 0 quantidades visíveis; idêntico ao HEAD.
- Varredura das 163 suítes de UI: idêntica à base V16 (27 falhas antigas, 0 regressões).

## Falhas preexistentes (separadas das regressões)

- 27 suítes de UI da base V16 (catalogadas desde a V15).
- `tests/v289-visual-fixtures.test.js`: 2 falhas (preexistentes, idênticas no HEAD; fora do `npm test`).
- Flutuação de infraestrutura: `page.goto` com timeout de 5 s (`dividends-premium-charts` e outros) sob carga; passam isolados e na repetição; nenhuma asserção relaxada.
- Axe no tema claro (pré-existente, Lote D): Auditoria 318, Renda Fixa 33, Metas 27, Aportes 5 em blocos recolhidos.

## Riscos restantes

- F-11: o ganho só vale após deploy do proxy (não autorizado).
- F-12/F-13 (Monte Carlo) e metodologia de Monte Carlo sem rótulo de estimativa na tela.
- `fmtP` com vírgula também altera os PDFs de relatório (texto legível, não dado); reverter é trivial se preferir manter ponto nos PDFs.
- Em `reportPdfPreview` um `toFixed(1)` de participação permanece com ponto (função de PDF excluída da troca).
- O bloco por ativo "YTD pago" do detalhe do ativo não foi tocado (F-06 cobre só o resumo de Dividendos).

## Próximo (Lote D)

F-07 (PM/Preço atual nos rankings; 6 altas/6 baixas; filtros Todos/Ações/FIIs/ETFs), contraste do tema claro, linguagem técnica (V254/V257/M1401, enums EN, textos sem acento), Metas mobile, acabamento do selo "Parcial".
