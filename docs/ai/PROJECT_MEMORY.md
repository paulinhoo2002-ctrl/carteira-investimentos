# Project Memory

## PR #266 - Dividendos

- Acessibilidade: touch targets, focus-visible e contraste com tokens.
- CSS escopado em `.div-premium`; evitar seletores globais para mudancas locais.
- Smoke Playwright dedicado, sem alteracao financeira ou de persistencia.

## PR #267 - Renda Fixa

- `saveRfMovimentacao` passou a manter principal e bases de valor atual coerentes apos resgate; reducao de principal nunca e ganho.
- `svA` preserva o tipo oficial de Renda Fixa quando o modal nao expoe `f-ty`.
- Foram adicionados dois testes de regressao e `tests/rf-partial-redemption.smoke.test.js`.

## Contexto Operacional

- Clone usado na validacao e merge: `C:\Projetos\carteira-investimentos-buildcheck`.
- Main apos PR #267: `ba9eafdbbb7e0d137f7aff82da26d2b134384f75`.
- O SHA e contexto operacional; validar Git novamente antes de confiar nele.

## Test Mode e Build

- `testMode` usa fixture em memoria; `save()` nao representa persistencia real e `reload` reinicializa a fixture.
- Smokes em `testMode` devem validar estado, UI, calculos e telemetria durante a sessao, sem exigir persistencia apos reload.
- EPERM de `npm run build:modern` somente no sandbox deve ser validado em PowerShell normal do Windows. Nao alterar ACL, usar `takeown` ou desabilitar protecoes.

## Trabalho Paralelo

- Para trabalho critico ou simultaneo, preferir branch, worktree ou clone isolado.
- Antes de editar, confirmar repositorio, branch, HEAD, status e `origin/main`.
- Se houver working tree suja de outra feature, parar; nao usar `reset`, `clean`, `stash` ou `restore` sem autorizacao.

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
