# IR2026 — Pedido de documentos externos (gerado do checklist de blockers)

Prioridades derivadas da matriz fiscal 2026 (61 vendas, 32 held candidates).
Cada documento resolve blockers específicos e **promove** o status fiscal
via engine de precedência (níveis 1–4 certificam; nada é promovido sem estes).

## PRIORIDADE 1 — Posição de 31/12/2025 com custo por ativo

- **DOCUMENTO**: Informe de rendimentos 2025 da corretora (seção "Posição /
  Ativos" com **custo de aquisição**) OU extrato de posição emitido com coluna
  de custo, datado 31/12/2025.
- **WHY_NEEDED**: é a única evidência nível 1 que transforma a abertura
  DERIVED/PARTIAL/UNKNOWN em CERTIFIED (hoje: 0 CERTIFIED de 32).
- **PERIOD**: 31/12/2025 (exato; snapshots de outra data não servem de abertura).
- **EXPECTED_FIELDS**: ticker, quantidade, custo total de aquisição (ou custo
  médio), corretora/custódia.
- **BLOCKERS_RESOLVED**: MISSING_OPENING_COST, MISSING_OPENING_QTY,
  PRE_COVERAGE_HOLDING (5 assets: incl. posições anteriores a nov/2019),
  e desbloqueia resultado realizado das 50 vendas bloqueadas por opening.
- **PRIORIDADE**: 1 (desbloqueia ~R$32k de vendas bloqueadas + certifica as demais).

## PRIORIDADE 2 — Prejuízos acumulados anteriores

- **DOCUMENTO**: Informe/tabela de prejuízos a compensar (geralmente no mesmo
  informe de rendimentos ou na declaração IRPF 2026 exercício 2025),
  **separado por operação comum (swing) e day trade**.
- **WHY_NEEDED**: carry-forward 2026 fica UNKNOWN sem isto; imposto devido
  permanece bloqueado/parcial onde houver compensação.
- **PERIOD**: saldo em 31/12/2025 por bucket.
- **EXPECTED_FIELDS**: bucket (comum/day trade/FII), saldo de prejuízo.
- **BLOCKERS_RESOLVED**: MISSING_PRIOR_LOSS (toda a cadeia de TAX_DUE).
- **PRIORIDADE**: 2.

## PRIORIDADE 3 — IRRF 2026 por operação/mês

- **DOCUMENTO**: Extrato de IR/impostos da corretora por mês de 2026 (ou
  informe parcial "ano atual"), com IRRF de operações comuns E day trade.
- **WHY_NEEDED**: hoje IRRF_STATUS=UNKNOWN (0 linhas no export de movimentação;
  ausência nunca é tratada como zero).
- **PERIOD**: 01/2026 até o mês mais recente.
- **EXPECTED_FIELDS**: mês, ativo/operação, valor IRRF, classe (comum/day trade).
- **BLOCKERS_RESOLVED**: MISSING_IRRF (reconciliação mensal automática no
  engine: statement vs eventos; mismatch vira CONFLICT, nunca auto-ajuste).
- **PRIORIDADE**: 3.

## PRIORIDADE 4 — Taxas itemizadas / notas de corretagem

- **DOCUMENTO**: Notas de corretagem de 2026 (PDF) ou extrato de taxas com
  corretagem + emolumentos + taxa B3 por operação.
- **WHY_NEEDED**: o export traz apenas valores de liquidação; taxas por
  operação estão ausentes (MISSING_FEES em todas as 61 vendas). O engine já
  aloca taxas itemizadas ou rateia total por valor bruto (regra determinística
  documentada).
- **PERIOD**: 01/2026 em diante.
- **EXPECTED_FIELDS**: operação, corretagem, emolumentos, taxa de liquidação.
- **BLOCKERS_RESOLVED**: MISSING_FEES.
- **PRIORIDADE**: 4.

## PRIORIDADE 5 — Confirmação das vendas sem valor (26 linhas)

- **DOCUMENTO**: confirmação da corretora (ou nota de corretagem) para as
  movimentações de 2026 sem valor no export — assinatura de custódia/
  empréstimo (mesmo dia, mesma quantidade, "Transferência - Liquidação" +
  "Empréstimo"). Ativos: BBAS3 (15), VALE3 (6), PETR4 (3), CMIG4 (1), SUZB3 (1).
- **WHY_NEEDED**: sem confirmação, permanecem LENDING_CUSTODY_UNPRICED /
  MISSING_SALE_AMOUNT (nunca precificadas por preço de mercado).
- **EXPECTED_FIELDS**: natureza da movimentação (venda real X custódia/
  empréstimo) e, se venda real, o valor de liquidação.
- **BLOCKERS_RESOLVED**: MISSING_SALE_AMOUNT + LENDING_CUSTODY_UNPRICED.
- **PRIORIDADE**: 5.

---

**Como entregar**: colocar os arquivos em uma pasta local e apontar o caminho.
O entrypoint `node ir2026/scripts/ingest-dry-run.js <arquivo.json|pasta>` faz
hash → detecção de tipo por conteúdo → matching → propostas de promoção →
conflitos → delta de cobertura, **sem escrever nada**. Promoções só são
aplicadas após revisão humana dos conflitos.
