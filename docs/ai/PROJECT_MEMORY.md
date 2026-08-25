# Project Memory

## FULL EXECUTION AUTONOMY

The operational policy for Codex, OpenCode and Hermes is maintained in
`docs/ai/AGENT_AUTONOMY.md`. Authorized phases may proceed autonomously through
analysis, implementation, tests, browser validation, correction and review.
Financial semantics, persistence, merge and deploy remain protected gates.

## ui-ux-pro-max

- Instalacao oficial validada no clone de infraestrutura com `ui-ux-pro-max-cli` `2.14.1`.
- Codex foi gerado em `.agents/skills/`; OpenCode em `.opencode/`.
- O CLI gera a skill principal e auxiliares oficiais; nao duplicar manualmente em outros caminhos.
- A skill foi exercitada com a busca oficial de design system para o Dashboard, sem alterar codigo da aplicacao.

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

## Current Product Baseline

- Produto: Carteira de Investimentos, SPA legada em `index.html`.
- Baseline atual da `main`: Fase 12 concluida no merge `3e8026aa005ab281176d0a496896fb2318353341`.
- Visual Master aprovado: padrao premium dark, sidebar lateral como navegacao principal e informacao financeira densa, clara e executiva.
- Baseline visual: Dashboard, Dividendos, Ativos e Rentabilidade.
- Numeros de referencias e mockups sao ilustrativos; dados reais da carteira sempre prevalecem.
- Nao reintroduzir elementos removidos sem justificativa e evidencia de necessidade.
- Metas, Rebalanceamento e demais telas devem manter a mesma linguagem sem alterar regras financeiras.
- Dispositivos prioritarios: Samsung Galaxy S25 (~6,2 polegadas) e notebook Dell (~14 polegadas).
- Viewports de validacao: 390x844, 430x932, 768x1024, 1366x768 e 1920x1080.
- Breakpoints adicionais quando necessarios: 960x768, 1024x768, 1180x820 e 1181x820.

### Fase 12 - estado consolidado

- `PHASE_12_PIXEL_CLOSE_VISUAL_PARITY`: MERGED.
- Merge commit: `3e8026aa005ab281176d0a496896fb2318353341`.
- Production: SUCCESS.
- Dashboard: executivo, sem voltar a uma evolucao patrimonial gigante.
- Dividendos: resumo, evolucao e historico sao a hierarquia primaria.
- Ativos: categorias compactas e inicialmente recolhidas.
- Rentabilidade: KPIs e comparacao de indices como foco.
- Rebalancear permanece compacto; Metas preserva a linguagem visual sem redesign gratuito.
- Sidebar e navegacao lateral sao o padrao desktop principal.

O Visual Master e baseline oficial ativo. Mudancas futuras devem corrigir bugs,
responsividade, acessibilidade, densidade ou inconsistencias sem destruir a
composicao aprovada.

Para a politica completa de autonomia, limites e continuidade entre agentes,
consulte `docs/ai/AGENT_AUTONOMY.md`. Para selecionar ferramentas e Skills,
consulte `docs/ai/SKILLS.md`.

## Pull Requests

### PR #260
**Resumo**: fix(movements): corrige edição e exclusão por id

### PR #261
**Resumo**: feat(sales): simplifica fluxo de venda de ativos

### PR #262
**Resumo**: fix(ui): corrige resgate RF, edição e refresh de cotação

## Permanent Decisions

- `frontend-design` passa a ser skill local padrao para telas, modais e refinamentos visuais.
- Em tarefas de interface, combinar `frontend-design` com `interface-design`, `playwright`, `impeccable` e `caveman-review` conforme o escopo.
- A skill orienta a apresentacao e a usabilidade, mas nao autoriza mudancas em regras financeiras, persistencia ou schema.

- `docs/ai/AGENT_AUTONOMY.md` registra a politica de autonomia para Codex, OpenCode, Hermes Agent e outros agentes autorizados. Contem escopo, limites, areas protegidas, autonomia visual/UX, liberdade ampliada para Hermes, Browser Harness, correcoes, areas financeiras protegidas, dados, git, commits, push/merge/deploy, qualidade minima, direcao do produto e memoria persistente. Agentes devem consultar este documento antes de fases maiores.

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
