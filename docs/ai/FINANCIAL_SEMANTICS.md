# Semântica financeira e de dados

Este é um mapa curto de invariantes. Os contratos detalhados continuam em
`FINANCIAL_RULES.md`, `FINANCIAL_INVARIANTS.md`, `PRODUCT_CONTRACTS.md` e
`FIXED_INCOME_VALUATION.md`.

- Indisponível, desconhecido e futuro não são zero.
- Zero só pode ser exibido quando o zero é autorizado pela fonte/contrato.
- Valor manual de Renda Fixa é autoridade manual; nunca é sobrescrito por
  estimativa automática.
- Estimado, fallback e stale devem ser distinguíveis de valor autoritativo.
- Proventos do ledger, referências e patrimônio são métricas diferentes; não
  somar a mesma evidência duas vezes.
- Importação exige preview, deduplicação, validação e confirmação explícita.
- QA, preview e leitura cloud não devem criar escrita financeira.
- Backup/restore preserva significado dos dados; nenhuma migração silenciosa.
- Eventos corporativos permanecem shadow/read-only até autorização própria.
- Alterações nestas regras exigem `doubt-driven-development`, testes de
  contrato e autorização explícita da fase financeira.

