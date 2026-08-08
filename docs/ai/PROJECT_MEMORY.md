# Project Memory

Historical facts and permanent decisions from the project's evolution.

## Pull Requests

### PR #260
**Resumo**: fix(movements): corrige edição e exclusão por id

### PR #261
**Resumo**: feat(sales): simplifica fluxo de venda de ativos

### PR #262
**Resumo**: fix(ui): corrige resgate RF, edição e refresh de cotação

## Permanent Decisions

- Nunca duplicar `saveRfMovimentacao`; sempre reutilizar a função oficial.
- Sempre reutilizar `finance-core.js` para cálculos financeiros; nunca criar cálculos paralelos.
- Renderização da UI deve ser baseada no estado global `S` (ou equivalente via persistence).
- Persistência de dados deve ser centralizada em `persistence-core.js`; nunca duplicar lógica de storage.
- Sempre validar alterações de UI com testes Playwright em múltiplos viewports (390px, 768px, 1366px, 1920px).
- Nunca inventar regras financeiras; todas as regras devem ser extraídas do código existente (`finance-core.js`, `persistence-core.js`).
- Sempre reutilizar fluxos oficiais de movimentação (ex: `openRfMovementEditor`, `saveRfMovimentacao`).
- Preservar dados existentes (carteira, proventos, renda fixa, metas, backup) em todas as alterações.
- Cada alteração deve ter um rollback simples e verificável.
- Não reconstruir funções estáveis a cada fase; preferir alterações pontuais e verificáveis.
- Uma mudança por objetivo; diffs pequenos e temáticos.
- Antes de qualquer alteração, auditar o código existente e documentar o impacto.
- Após alterações, validar com os testes unitários e de integração exigidos pela governança do projeto.