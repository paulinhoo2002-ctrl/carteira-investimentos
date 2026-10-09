# V345 — Checkpoint: correções de verdade financeira e proteção XLSX

Versão: v1 · 2026-10-09 · Missão V345/V345.1 (continuação da noturna V344)

## V345 — Correções financeiras (PR #463, HEAD `66d08d2`)

Bugs corrigidos (todos pré-existentes na reaplicação V327, expostos por auditoria):

1. **Venda lia campo errado de taxas**: o branch `venda` de
   `quickMovementBuildAporteFromFields` validava `qm-buy-fees`, input que só
   existe no formulário de compra. Taxas digitadas na venda eram ignoradas e o
   foco de erro apontava para campo inexistente.
   Correção: lê `qm-sell-fees` (o campo que o form da venda renderiza).
2. **Taxas UNKNOWN viravam zero confirmado**: `quickMovementSaleRealizedPnl`
   fazia `fees:fees||0` no candidate enviado ao motor V326 — taxas ausentes
   (opcionais) viravam 0 confirmado, produzindo P&L realizado `COMPLETE` falso.
   Correção: `fees:fees??null`; o motor continua marcando `MISSING_FEES` →
   `NEEDS_REVIEW` (contrato já coberto por testes V326).
3. **"Líquido" confirmado sem taxas**: o preview de venda exibia
   `grossValue-0` quando as taxas estavam vazias. Agora exibe `—` (UNKNOWN)
   quando as taxas não são conhecidas.

Evidência RED/GREEN: `tests/v345-sale-fees-validation.test.js` — RED 2/3 no
código antigo, GREEN 3/3 após correção. V327 13/13 intacto; contrato
`fees:null` no reg preservado (`empty→null`).

Gates no SHA `66d08d2`: focados 41/41; `npm test` 867/867 (12 suítes);
`test:modern` 823/823; `qa:all` PASS (OVERFLOW/CONSOLE/PAGE/REQUEST=0);
`verify:release` EXIT=0; build PASS; `git diff --check` PASS.
CI remoto 5/5 (run `37870516289`); Vercel Preview READY.

## V345.1 — Proteção XLSX fail-closed (PR #464, HEAD `08047bd`)

Branch isolada `codex/v345-xlsx-source-protection` sobre `main` `6eb69f2` —
delta mínimo da PR #446 (V323) sem o stack v324/v325 que a impedia de mesclar:

- `importCenterWorkbookProvider()`: evidência de provedor (XP/B3/UNKNOWN) por
  nome de arquivo, nomes de abas e metadados, antes de qualquer parsing.
- Gate em `importCenterParseSpreadsheet`: XP → `UNSUPPORTED/XP_LAYOUT_REQUIRES_FIXTURE`;
  não-B3 com aparência de layout conhecido → `REVIEW_REQUIRED/SOURCE_IDENTITY_UNCONFIRMED`;
  desconhecido → `UNSUPPORTED/LAYOUT_NOT_RECOGNIZED`. Fonte ambígua nunca é
  parseada diretamente.
- `importCenterHasPositionEvidence()`: extraído do scan inline (comportamento
  idêntico, reutilizável pelo gate).

Evidência RED/GREEN: testes originais da #446 (`tests/v323-source-detector.test.js`)
— RED 6/11 no main puro, GREEN 11/11 com o delta. Regressão Import Center 34/34;
`npm test` 867/867 (12 suítes, 0 fail); sintaxe inline OK.
CI remoto 5/5 (run `37871294602`); Vercel Preview READY.
PR #446 original intacta — encerramento como SUPERSEDED é gate humano.

## Limitações conhecidas

- MINOR (aberto): taxas informadas com parse inválido (`!feesValue.ok`) não
  alertam no preview em tempo real; a validação bloqueia no save com erro
  explícito. Correção isolada futura, sem urgência (fail-closed já garante).
- V345/V345.1 certificam o runtime sintético local + CI Ubuntu; não certificam
  produção, persistência autenticada ou outros navegadores.

## Flags

`REAL_WRITES=0` · `REAL_IMPORT=false` · `REAL_RESTORE=false` · `PRODUCTION=false` · `MERGE=false`
