# Fase 1a — Auditoria de equivalência financeira

Data: 2026-11-08 · Branch: `fundacao/fase1-indicadores` (criada de `d62fdc7`) · Referência: `origin/main` (`f8fef82`).
Escopo: somente leitura. Nenhum arquivo de produto foi alterado (`index.html`, CSS, Finance Core, Persistence Core, `package.json` intactos). Criados apenas este documento e `tests/fase1a-financial-equivalence.test.js`.
Dados: 100% sintéticos (`fp-rich-fixture`, `v17-fin-fixture`). Skills: Superpowers e Caveman; Ponytail não está instalado.

Legenda de certeza: **[Certo]** medido ou lido no código · **[Provável]** inferência forte · **[Não verificado]**.

## 1. Veredito

1. **Cálculo central equivalente [Certo]**: `cx()` (patrimônio `tC`, aplicado `tI`, resultado `tG`, rentabilidade `tGP`, `appliedComplete`) é **idêntico à `main`** em 4 estados sintéticos (completo, parcial, sem cotações, vazio). `dividendAnnualMatrixData` tem hash idêntico; `dividendAssetSummary` e `dividendsByAssetView` produzem o mesmo texto.
2. **11 de 14 telas comparadas têm todos os valores monetários e percentuais idênticos** à `main` nos 4 estados (Ativos, Lançamentos, Análise, Patrimônio, Rentabilidade, Renda Fixa, Rebalanceamento, Relatórios, IRPF, Insights, Confiabilidade). As 3 restantes (Dashboard, Dividendos, Metas) têm diferenças explicadas abaixo.
3. **Mas o diff vazio dos módulos financeiros NÃO prova equivalência** — conforme a condição 4. O `index.html` da V20 contém **lógica numérica nova** que não existe na `main` (variação diária, agregações do gráfico/ranking de Dividendos, "Recebido no ano", lançamentos recentes) e **uma modificação** (precisão de quantidade). Dois desses itens têm achados abertos (F-03, F-05).
4. **Nenhum achado altera patrimônio, aplicado, resultado, proventos ou renda fixa.** Os achados afetam: a **Variação diária** (nova, com viés de ~2% no valor), a **precisão de exibição de quantidades**, e a **comunicação de estados parciais/desconhecidos**.
5. Divergências **não estão aprovadas**: abaixo cada uma tem evidência e proposta. Nenhuma foi corrigida (fora do escopo).

## 2. Método

- **Inventário integral do diff**: `git diff -U0 origin/main...HEAD -- index.html` = 217 hunks. Separados por faixa de linhas (dentro/fora de `<style>`): **90 hunks CSS** (1.650 linhas) e **127 hunks fora de `<style>`** (543 linhas, JS/HTML de templates). Os 127 foram lidos um a um (não só por palavras-chave). Os demais arquivos de produto alterados: `dashboard-premium.css` (−7 linhas) e `package.json` (1 linha, registro de teste).
- **Comparação diferencial**: `origin/main` extraída em pasta temporária (bytes do `index.html` idênticos aos do Git) e a árvore atual, servidas lado a lado; mesma fixture aplicada nas duas; 4 estados; 14 rotas.
- **Comparação por tokens**: multiconjunto de valores `R$ …` e `…%` do texto visível de cada tela (não depende de palavras-chave de código). Tokens "só na main"/"só na V20" são investigados um a um.
- **Comparação por função**: `cx()`, `dividendAnnualMatrixData`, `dividendAssetSummary`, `dividendsByAssetView` executadas nas duas versões.
- Reproduzível: `node --test tests/fase1a-financial-equivalence.test.js` (exige `origin/main` local e `tar`; ~40 s; **não** foi adicionado ao `npm test`).

## 3. Classificação dos 127 hunks fora de `<style>`

Cobertura exata: 127 hunks, cada um em uma única classe (conferido por script; nenhum duplicado ou omitido).

| Classe | Qtd | Hunks (ids do diff) | Resumo |
|---|---|---|---|
| **Apresentação sem alteração de cálculo** | 94 | #74–#100, #103–#109, #112–#115, #117–#137, #141, #142, #144–#149, #164–#168, #171–#177, #183, #187–#200 | Classes, `aria-*`, cores `#hex`→`var(--fp-*)`, tamanhos de fonte, títulos/níveis de cabeçalho, ícones SVG (`fpIcon`), botões compactos, `<details>` na Auditoria (#103–#104: só o contêiner e o rótulo "N de M"), seletor de período movido (#164), ordenação acessível de colunas, formatação de data/hora. Nenhuma expressão aritmética de negócio alterada. |
| **Apresentação — privacidade** | 6 | #101, #102, #111, #138, #169, #170 | Máscara `'••••'` de quantidade/identificação quando `S.hideValues`. Só mascara texto. |
| **Reorganização com mesma lógica** | 20 | #139, #140, #143, #150–#152, #154–#162, #178–#180, #185, #186 | `dashboardPositionResult` (mesmas condições `sameBasis/amountValid/percentValid/resultAvailable` do cartão antigo), `dashboardPriorityItems/Chip`, saudação, remoção do seletor antigo de período, `cellMoney` (só tira o prefixo `R$` do texto da célula), reordenação de blocos. **Equivalência verificada** (§4). |
| **Lógica numérica nova** | 6 | #116 (`fpIncomeChart`, `fpTopPayers`), #153 (`dashboardRecentTransactionsPanel`), #163 (`dashboardDailyVariation`), #181–#182 (`Recebido em <ano>`), #184 (usa os novos componentes) | §5. |
| **Lógica numérica modificada** | 1 | #110 (`a.qty.toLocaleString('pt-BR')` → `fmtN(a.qty)`) | §5, F-05. |
| **Diferença de metodologia ou período** | 0 | — | Nenhum hunk introduz. Há diferenças **pré-existentes** entre telas (F-01, §6). |
| **Inconclusiva, exige investigação** | 0 hunks | — | Nenhum hunk ficou inconclusivo. Pendente de investigação em 1b: F-01 (regras de disponibilidade Ativos × Dashboard). |

Os 90 hunks CSS (1.650 linhas, dentro de `<style>`) e `dashboard-premium.css` (−7 linhas) não contêm lógica; a conferência de cobertura/regressão visual é da 1e. O inventário completo está em `output/fase1/work/index.diff` (fora do Git).

## 4. Equivalência comprovada (testes passam)

| Verificação | Resultado |
|---|---|
| `cx()` (tC, tI, tG, tGP, appliedComplete) | idêntico — completo `82557/77982/4575/5,8667%`; parcial `100797/95982/4815/5,0166%`; sem cotações idêntico; vazio zeros idênticos |
| Cartões do Dashboard: Patrimônio atual, Recebido no mês, Resultado da posição | idênticos nos 4 estados |
| Tokens R$/% de 11 telas × 4 estados | idênticos |
| Matriz anual de proventos (JSON) | hash idêntico `06775fae035eec0b` |
| Ranking por ativo (valor e participação) | `fpTopPayers` = `dividendsByAssetView` da main (QAFJ11 R$ 9.207,30 / 31,7%; QAFI11 R$ 8.310,75 / 28,6%; QACC3 R$ 4.213,10; QABB4 R$ 3.679,80; QAAA3 R$ 3.647,40) |
| KPIs de Dividendos (este mês, 12M, média, último mês) | idênticos em 3 estados |
| "Recebido em 2026" (novo) | = "Total de proventos" do IRPF 2026 (R$ 11.014,95) |
| Lançamentos recentes (Dashboard) × lista de Lançamentos | 5 de 5 valores iguais (inclui venda R$ 235,50) |
| Capital em "Valor investido" (V20) | = valor que a main mostrava no contexto do Patrimônio (R$ 95.982,00 / parcial R$ 67.944,00) |
| Estado vazio, KPIs do topo de Dividendos | `—` (indisponível), não zero |
| Suítes existentes no checkout | finance 211/211, persistence 32/32, ui 378/378 |

## 5. Lógica nova/modificada e achados

### F-03 — Variação diária usa base errada (lógica nova, **achado aberto**)
- [Certo] `dashboardDailyVariation` (index.html ~33383): `Σ qtd × preço × (change/100)`, com `change = regularMarketChangePercent` (index.html 25975/26036) e `preço = quote.price`. Esse percentual é **sobre o fechamento anterior**; o preço da cotação já é o atual. O delta em R$ correto é `qtd × preço × c/(100+c)`.
- Fixture sintética: exibido **+ R$ 224,15 / +0,36%**; sobre o fechamento anterior: **R$ 219,76 / +0,35%** (diferença R$ 4,38 ≈ 2,0%). Sensibilidade a +10% em todos os ativos: **R$ 6.293,70 vs R$ 5.721,55** (+10%).
- O percentual agregado é praticamente igual; o **valor em R$ é sistematicamente maior em ganhos e menor (em módulo) em perdas**. Efeito pequeno com variações diárias típicas (±2%), mas é erro de método num indicador novo e fixo no topo do Dashboard.
- Teste: `todo` F-03 (descreve o comportamento correto; falha hoje).
- Proposta (fase própria, com autorização): usar `price×c/(100+c)` e base `price/(1+c/100)`; documentar no glossário.

### F-04 — Desconhecido tratado como zero na cotação (pré-existente, exposto pelo novo KPI)
- [Certo] A ingestão grava `change: Number(q.regularMarketChangePercent) || 0` (25975, 26036): variação **ausente vira 0%** e o ativo passa a contar como "N ativo(s) com cotação" na Variação diária (o filtro `Number.isFinite(q.change)` nunca barra). Também `price = q.price ?? a.current_price ?? 0`: preço ausente contribui 0 em silêncio.
- Viola a regra "desconhecido ≠ zero" na entrada do cálculo. Não foi introduzido pela V20, mas passou a alimentar um KPI novo.
- Proposta: guardar `change: null` quando ausente e excluir do cálculo/contagem; testes em fixture com `change` ausente.

### F-05 — Precisão de quantidade (lógica modificada, **achado aberto**)
- [Certo] #110 troca `a.qty.toLocaleString('pt-BR')` por `fmtN(a.qty)` na tabela "Qtd" de `assetPerformanceOverviewPanel` (Ativos › Desempenho). Para inteiros é igual; para fracionários: `1234.5678` → `1.234,568` (main) vs `1.234,57` (V20); `0.12345` → `0,123` vs `0,12`.
- Há ainda `qty.toFixed(4)` em outros pontos (#138/#169/#170): **três precisões diferentes** (2, 3, 4 casas) para a mesma grandeza. Afeta ETFs/cripto/frações; não afeta cálculo.
- Teste: `todo` F-05. Proposta: um único formatador de quantidade (≥4 casas, sem arredondar além do dado).

### F-02 — "Valor investido" como KPI de destaque mostra soma parcial
- [Certo] Com base aplicada incompleta (`appliedComplete=false`, ex.: ativo sem preço médio) o V20 mostra **"Valor investido R$ 67.944,00"** com a legenda "Capital informado parcialmente"; a main mostrava o mesmo número só como contexto do Patrimônio. O valor é idêntico; mudou a **proeminência**: um total parcial virou número principal e a ressalva ficou numa legenda pequena. Resultado da posição permanece `—` (correto).
- Classificação: apresentação sem alteração de cálculo, **risco de leitura** ("parcial ≠ completo"). Proposta: selo "Parcial" junto ao valor.

### F-06 — Zero com cobertura desconhecida em Dividendos (pré-existente)
- [Certo] Com carteira vazia, o bloco "Resumo de renda e cobertura" exibe **"YTD pago R$ 0,00"** e **"Últimos 12 meses R$ 0,00"** ao lado de "Cobertura desconhecida" (main e V20). Os KPIs do topo da V20 mostram `—` corretamente; a main mostrava zero também em "Top ativos". Teste `todo` F-06.

### F-07 — Informação do ranking deixou de ser visível no Dashboard
- [Certo] Em 1440 px (e nas capturas mobile) as linhas de "Maiores altas/baixas" não exibem mais **PM e Preço atual** (ex.: `PM R$ 28,40 · Atual R$ 36,90`): o `textContent` ainda tem, o `innerText` não (CSS `display:none` em `.dashboard-highlight-details`, index.html ~41601). Percentual e ganho em R$ são idênticos aos da main. É apresentação, mas **remove informação que a main exibia** e que a próxima fase (6 altas/6 baixas) precisa decidir se mantém.

### F-08 — Simulação Monte Carlo não é reprodutível (pré-existente, fora do diff)
- [Certo] `analytics-passive-income-projection.js:222` usa `Math.random()`; em Metas, "Prob. Sucesso (MC)" variou entre execuções com os mesmos dados (56,0% × 63,5%; medianas 182,0 K × 192,8 K). Não é divergência main × V20 (arquivo idêntico). É **não determinismo** que o glossário e os testes de consistência precisam tratar como "estimativa".

### F-09 — Separador decimal inconsistente (apresentação)
- [Certo] Top ativos usa `31,7%`; Dashboard/Análise/Rebalanceamento usam `+29.93%`, `21.5%`. O V20 introduziu vírgula num ponto e manteve ponto nos demais.

## 6. Diferenças de metodologia/período já existentes (insumo da Fase 1b)

- **F-01 [Certo, pré-existente]**: no estado parcial o Dashboard mostra **Valor investido R$ 95.982,00**, enquanto **Ativos** mostra "Total investido —", "Valor atual —", "Lucro/prejuízo —" (tokens idênticos na `main`). Mesma família de indicadores, **regras de disponibilidade diferentes** entre telas. Precisa de decisão de produto/financeira (não visual).
- IRPF "Total aplicado" (R$ 4.135,50) ≠ Dashboard "Valor investido" (R$ 95.982,00): bases distintas (custo de aquisição do ano-base de posições com movimento × capital aplicado total). [Provável] por definição; documentar em 1b.
- "Recebido no mês" (Dashboard) = "Recebido este mês" (Dividendos) [Certo].

## 7. Referência dos backups e patches (somente leitura)

**Origem das informações [Certo]**: pasta `C:\Projetos\_codex-backups\patches-2026-11-08\` (arquivos criados em 08/11/2026 12:36 por outro processo — não por esta auditoria; criação posterior ao commit V20) e `…\carteira-v16-d62fdc7-2026-11-08.bundle` (12:35). Os valores citados batem com o disco: `stash-10.patch` = 0 B; `stash-4.patch` = 18.205.997 B; `ux-worktree-untracked-list.txt` = 5 nomes.

| Item | Verificação | Resultado |
|---|---|---|
| `stash-10.patch` (0 B) | O stash `stash@{10}` vivo: diff rastreado vazio, 3º pai (não rastreados) vazio | **Fiel**: o stash está vazio. Um patch vazio é o esperado; não é corrupção. |
| `stash-4.patch` (~18 MB) | `git apply --numstat`: erro "git diff header lacks filename" na linha 924 | **Não aplicável por inteiro**: contém 143 entradas de arquivos novos (118 binários) e para de ser interpretável. O stash vivo tem 144 itens (1 rastreado com +30.533/−251 linhas + 143 não rastreados). O stash em si está íntegro no Git. |
| `stash-3.patch` | Mesmo erro de cabeçalho (linha 1474) | **Não aplicável por inteiro** (50 não rastreados, 32 binários). |
| `stash-5.patch` | Interpreta 1 de 4 itens (o stash tem 2 renomeações + 2 não rastreados) | **Incompleto** (renomeações não capturadas). |
| demais `stash-N.patch` | `git apply --numstat` lê o nº esperado de arquivos (0,1,2,6,7,8,9,11–14) | Consistentes (obs.: 6 só contém o arquivo não rastreado, coerente com stash sem diff rastreado) |
| Formato | Todos começam com BOM UTF-8 (`EF BB BF`) e o patch da UX tem 2.727 CRs | Artefato de redirecionamento do Windows PowerShell; `git apply` ainda lê, mas a aplicação literal merece `--ignore-whitespace` e teste prévio |
| `ux-worktree-tracked.patch` | `numstat` do patch = `diff` vivo da worktree (23 arquivos; +1.216/−215) | **Logicamente completo**; bytes diferem por CRLF/BOM (250.049 B × 242.620 B) |
| 5 arquivos não rastreados da worktree UX | Os 5 existem na worktree (53.769 B, 5.028 B, 8.707 B, 4.177 B, 2.697 B) | **Só os nomes estão no backup** (`ux-worktree-untracked-list.txt`); **o conteúdo não está** em patch, bundle nem zip. Confirmado: ainda fora do backup. |
| Bundle | `git bundle verify`: histórico completo; refs `feat/v16-premium-redesign` (`d62fdc7`), `feat/kpi-variacao-diaria` (`9c572cd`), `refs/stash`, `origin/main` | **Íntegro**; cobre commits e a ref de stash, **não** os 5 arquivos não rastreados nem a árvore de trabalho. |

Nenhum stash, worktree ou arquivo de terceiros foi modificado. Nenhum patch foi aplicado.

## 8. Limitações

- Fixtures sintéticas não têm taxas/corretagem, moedas, desdobramentos, bonificações nem histórico de cotações; a equivalência de **lançamentos recentes com custos** e de rentabilidade histórica **não está provada**.
- A comparação por tokens cobre valores `R$` e `%`; não cobre contagens ("7 ativos"), datas nem texto. Cobre 14 rotas; **Configurações, Importar dados, Auditoria e Eventos societários não entram** na comparação numérica (sem hunks numéricos).
- As cotações das fixtures são sintéticas; a semântica de `regularMarketChangePercent` como variação sobre o fechamento anterior é a convenção do provedor (Yahoo) [Provável].
- Estados completo/parcial/indisponível foram cobertos; **sem cotações** e **vazio** também. Zoom 125%/150% e larguras 360–2560 **não** fazem parte da 1a (são da 1e).
- O teste diferencial depende de `origin/main` local e de `tar`; hoje não roda no `npm test`.

## 9. O que pode afetar as fases seguintes

1. **F-03/F-04** (variação diária): decidir método antes de a variação diária ser usada em qualquer outro lugar; exige fase financeira própria.
2. **F-01** (Ativos × Dashboard): precisa de decisão de produto antes do glossário final (1b) — qual regra de disponibilidade é a verdadeira.
3. **F-02, F-07** (proeminência de parcial; PM/Atual ocultos): entram no desenho da Fase 2 (6 altas/6 baixas e avisos).
4. **F-05/F-09** (quantidade e separador decimal): padronização de formatadores, candidata à 1b/Fase 3.
5. **F-06/F-08**: tratar "zero com cobertura desconhecida" e estimativas estocásticas como estados de primeira classe no glossário.
6. Backups: antes de qualquer limpeza de worktrees, copiar o **conteúdo** dos 5 arquivos não rastreados da `ux-premium-responsive` e regerar `stash-3/4/5.patch` com `git stash show -p --include-untracked --binary` gravado em UTF-8 sem BOM (ação do proprietário/autorizada; não executada aqui).

## 10. Arquivos desta fase

- `docs/ai/FASE1_AUDITORIA_EQUIVALENCIA.md` (este documento)
- `tests/fase1a-financial-equivalence.test.js` (24 testes: 21 passam, 3 `todo` = F-03, F-05, F-06; 0 falham)
- Fora do Git: `output/fase1/work/` (diff completo, JSONs de comparação, scripts).

## 11. Atualização — Lote B (F-03 e F-04 corrigidos; local, sem commit)

- **F-03 corrigido**: `dashboardDailyVariation` usa `fechamento anterior = preço/(1+change/100)`; variação em R$ = `qtd × (preço − fechamento anterior)`; % = Σ variação / Σ base anterior. Fixture rica: **antes R$ 224,15 / +0,36% → depois R$ 219,76 / +0,35%** (7 ativos). Semântica confirmada: Yahoo (`regularMarketChangePercent` sobre o fechamento anterior, em pontos percentuais; o proxy `api/yahoo-quote.js` calcula `(preço−fechamento anterior)/fechamento anterior×100` quando preenche) e exemplo oficial da brapi (PETR4: 41,18 / −0,58 / −1,39%, que `price×c/(100+c)` reproduz e `price×c/100` não).
- **F-04 corrigido**: `quoteDailyChangePercent(q, price)` nos dois pontos de ingestão (Yahoo e brapi). Ausente, `null`, `''`, não numérico, `≤ −100` e preço que não pareia com `regularMarketPrice` viram `null`; zero informado continua `0`. O preço válido continua sendo gravado e alimenta o patrimônio. O cartão exclui posições sem variação válida e informa cobertura ("N de M ativo(s) com variação do dia", selo "Parcial" e dica "não representa necessariamente toda a carteira"); sem nenhuma válida mostra "—".
- **Sem persistência/migração**: `S.quotes` não faz parte do payload salvo; `finance-core.js`, `persistence-core.js`, `sw.js`, `manifest.json`, `firestore.rules`, `modern/src` e `api/yahoo-quote.js` sem diff.
- **Diferença intencional em relação à auditoria**: apenas o valor/legenda do cartão "Variação diária". `cx()` e todas as telas comparadas seguem idênticos à main (suíte da fase 1a).
- **Novos achados (não corrigidos, fora do escopo do Lote B)**:
  - **F-10**: a CSP (`index.html` e `vercel.json`) libera `https://api.brapi.com.br`, mas o código chama `https://brapi.dev/...`; o fallback brapi é bloqueado pelo navegador (observado no console). Pré-existente.
  - **F-11**: `api/yahoo-quote.js:115` devolve `regularMarketChangePercent = 0` quando o fechamento anterior é desconhecido no fallback chart v8 (`|| 0`). O cliente não consegue distinguir esse zero de um zero verdadeiro; corrigir exige alterar a função serverless (deploy, fora de autorização).

## 12. Atualização — Lote C (local, sem commit)

Estado dos achados F-01, F-02, F-05, F-06, F-08, F-09, F-10 e F-11, os novos F-12 e F-13, as diferenças intencionais, a validação (zoom real, matriz, privacidade, varredura de UI) e a automação (`npm run verify`, `npm run verify:full`, golden hermético) estão em `docs/ai/FASE1_HANDOFF.md`. O teste ao vivo contra `origin/main` (`npm run test:fase1a-baseline`) agora trata como diferenças intencionais: F-01 (Total investido em Ativos/parcial), F-09 (vírgula nos percentuais), F-03 (variação diária) e a precisão de quantidade (F-05); seus `todo` F-05 e F-06 viraram testes normais.

### Pendências financeiras bloqueantes (registradas antes dos commits do Lote C)

F-12 (`|| 0.10` trata zero como ausente no Monte Carlo de renda passiva) e F-13 (`Math.random() === 0` produz `Infinity`) **continuam abertos** e precisam ser resolvidos, com teste e decisão explícita sobre a metodologia, antes da versão final. Detalhes e testes `todo` em `docs/ai/FASE1_HANDOFF.md`.
