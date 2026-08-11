# Regras Absolutas do Projeto

## Limites da ui-ux-pro-max

- `ui-ux-pro-max` e complementar a stack `frontend-design` -> `interface-design` -> implementacao -> `playwright` -> `impeccable` -> `caveman-review`.
- Pode orientar UI, UX, layout, design system, charts visuais, hierarquia, tipografia, responsividade, acessibilidade e copy visual.
- Nao pode criar ou alterar formulas financeiras, saldo, patrimonio, preco medio, resultado, rentabilidade, proventos, IR, IOF, RF, schema, `FinanceCore`, `PersistenceCore` ou persistencia.
- Ao exibir dados financeiros, deve reutilizar as funcoes oficiais existentes e nunca criar fonte paralela.
- A instalacao deve ser feita pelo CLI oficial; nao copiar ou adaptar manualmente os arquivos gerados.

## Regras Consolidadas dos PRs #266 e #267

- CSS de acessibilidade deve ser escopado a tela ou componente da feature.
- Reducao de principal RF nunca e ganho; valores oficiais devem permanecer coerentes apos resgate.
- Edicao de ativo deve preservar o tipo oficial quando o modal nao permite alterar tipo.
- `testMode` usa memoria e nao comprova persistencia apos reload; nao relaxar as validacoes financeiras, visuais e de telemetria da sessao.
- EPERM de `build:modern` restrito ao sandbox deve ser validado em PowerShell normal antes de qualquer diagnostico de ACL.
- Trabalho paralelo exige branch, worktree ou clone isolado; confirmar repo, branch, HEAD, status e `origin/main` antes de editar.
- Working tree suja de outra feature exige parada; nao usar `reset`, `clean`, `stash` ou `restore` sem autorizacao.

Este documento contém as regras absolutas que devem ser seguidas por qualquer agente (humano ou IA) operando no repositório.

## Regras de Desenvolvimento

- **Nunca duplicar regra financeira**: Todas as regras financeiras devem ser extraídas diretamente do código existente em `finance-core.js` e `persistence-core.js`. Não inventar regras financeiras.
- **Reutilizar finance-core quando aplicável**: Para cálculos financeiros, sempre usar as funções oficiais de `finance-core.js`.
- **Persistência centralizada**: Todas as operações de persistência devem passar por `persistence-core.js`. Nunca escrever diretamente em storage se existir fluxo oficial.
- **Reutilizar saveRfMovimentacao para RF**: Para movimentações de renda fixa, sempre usar a função oficial `saveRfMovimentacao`.
- **Não criar cálculo paralelo**: Não criar funções ou lógica que duplique o comportamento existente em `finance-core.js` ou `persistence-core.js`.
- **Testes obrigatórios antes de commit**: Executar a suite completa de testes (`npm run test`) antes de qualquer commit.
- **Validação desktop/mobile para mudanças de UI**: Qualquer alteração na interface deve ser validada em múltiplos viewports (390px, 768px, 1366px, 1920px) usando Playwright.
- **Playwright para fluxos reais**: Usar Playwright para testar fluxos de usuário reais, não apenas unitários.
- **Não misturar objetivos diferentes no mesmo PR**: Cada PR deve abordar um único objetivo funcional ou de documentação.
- **Não alterar áreas protegidas sem autorização**: Áreas listadas em `AGENTS.md` como protegidas não devem ser alteradas sem autorização explícita e fase específica.
- **Respeitar AGENTS.md**: Seguir todas as diretrizes contidas em `AGENTS.md`.
- **Usar skills locais quando aplicáveis**: Antes de iniciar uma tarefa, verificar se alguma skill local em `.agents/skills` se aplica e utilizá-la.

## Regra de frontend-design

- Usar `frontend-design` em telas, modais e refinamentos de UX com impacto visual.
- Planejar direcao visual, hierarquia, tipografia, spacing, estados e responsividade antes de editar.
- Combinar com `interface-design`, `playwright`, `impeccable` e `caveman-review` quando aplicavel.
- Nao permitir que uma revisao visual altere regras financeiras, persistencia, schema ou areas protegidas.

## Limites da stack UI/UX

- `frontend-design` e `interface-design` nao podem criar regra financeira, calculo paralelo, persistencia, schema, fonte paralela de saldo ou rentabilidade, nem duplicar funcao oficial.
- Ao exibir dados financeiros, a UI deve reutilizar as funcoes oficiais existentes.

## Onboarding de continuidade

Ao iniciar em computador novo, clone novo, chat novo ou agente novo:

1. validar repositorio, branch, HEAD e status;
2. ler `docs/ai`;
3. executar `scripts/setup-ai.ps1`;
4. verificar ou restaurar as skills locais;
5. conferir `docs/ai/skills.lock.json`;
6. somente depois iniciar implementacao.

Uma skill nova relevante exige instalacao local, lock atualizado, documentacao, memoria e changelog.

## Regras de Documentação

- **Manter documentação em docs/ai**: Toda documentação persistente de IA deve ficar em `docs/ai/`.
- **Atualizar AI_BASELINE.md quando necessário**: Refletir mudanças na arquitetura ou processo de IA.
- **Manter arquivos de versão**: Manter `architecture-version.json` atualizado com o SHA do commit atual.
- **Registrar decisões permanentes**: Usar `DECISIONS.md` para registrar decisões arquiteturais que devam ser preservadas.
- **Manter changelog de IA**: Usar `AI_CHANGELOG.md` para registrar mudanças relevantes na infraestrutura de IA.
- **README como ponto de entrada**: `docs/ai/README.md` deve ser o primeiro documento a ser lido por qualquer agente novo.

## Regras de Git

- **Não fazer git add . / -A / commit -a**: Adicionar arquivos especificamente.
- **Não fazer force push sem autorização explícita**.
- **Não trabalhar na mesma branch simultaneamente em duas máquinas**.
- **Antes de trocar de máquina**: working tree limpo, commit criado localmente, branch enviada para origin, PR draft aberta quando aplicável.
- **Sempre encerrar documentalmente as fases funcionais antes da próxima**.

## Regras de Código

- **Preservar dados existentes**: Nunca reconstruir o sistema do zero em nome de modernização ampla.
- **Preferir alterações pontuais e verificáveis**.
- **Uma mudança por objetivo; diffs pequenos e temáticos**.
- **Rollback facil**: Cada mudança deve poder ser revertida de forma simples.
- **Não reconstruir funções estáveis a cada fase**.
- **Manter o comportamento existente, dados históricos e persistencia como ativos a preservar**.
