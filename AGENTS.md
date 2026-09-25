# AGENTS.md

Documento de governança aplicável a qualquer agente humano ou IA operando no
repositório `paulinhoo2002-ctrl/carteira-investimentos` (Hermes, Codex, Claude
Code, GitHub Copilot e similares).

Objetivo: garantir que o notebook e o computador compartilhem o mesmo conjunto
de regras para que a evolução do projeto seja previsível, reversível e sem
regressões funcionais.

Este arquivo complementa (e não substitui) as instruções oficiais já
versionadas em `docs/FLUXO-DESENVOLVIMENTO.md`, `docs/ESTABILIDADE.md`,
`docs/project-phases-roadmap.md`, `REGRESSION_CHECKLIST.md` e
`.github/PULL_REQUEST_TEMPLATE.md`. Em caso de conflito, siga a regra mais
conservadora que não altere o que já foi documentado em outros lugares.

## Identidade do projeto

- Repositório: `paulinhoo2002-ctrl/carteira-investimentos`.
- Finalidade: controle pessoal de investimentos.
- Comportamento existente, dados históricos e persistência são ativos a
  preservar.
- Não reconstruir o sistema do zero em nome de modernização ampla.

## PROJECT IDENTITY GATE — OBRIGATÓRIO

`MANDATORY_PROJECT_IDENTITY_GATE=true`.

Antes de editar, testar substancialmente, criar uma worktree, fazer commit,
push, abrir PR, fazer merge ou deploy, confirme nesta ordem:

1. diretório atual e raiz Git real;
2. `origin` e repositório esperado;
3. branch atual, HEAD e status da worktree;
4. diretório Git comum da worktree;
5. que o caminho pertence a `C:\Projetos\carteira-investimentos` ou a
   `C:\Projetos\carteira-investimentos.worktrees\*`;
6. que `C:\Projetos\carteira-2.0` não está sendo usado.

Registre internamente `PROJECT_IDENTITY_CHECKED`, `PROJECT_IDENTITY_MATCH`,
`CURRENT_PATH`, `GIT_ROOT`, `GIT_REMOTE`, `CURRENT_BRANCH` e `CURRENT_HEAD`.
Se qualquer item não puder ser comprovado, defina
`PROJECT_IDENTITY_MATCH=false`, `STATUS=BLOCKED_WRONG_PROJECT` e
`STOP_IMMEDIATELY=true`. Não tente adaptar ou misturar repositórios.

Toda nova worktree deve ficar sob
`C:\Projetos\carteira-investimentos.worktrees\` e usar o mesmo Git comum e
remote do projeto canônico. A raiz factual das Skills é
`C:\Projetos\carteira-investimentos\.agents\skills`; o caminho adjacente
`C:\Projetos\carteira-investimentos.agents\skills` não é canônico.

## LEGACY Mandatory Agent Bootstrap

Para toda missão substancial neste projeto:

1. Execute o PROJECT IDENTITY GATE acima; o único workspace autorizado é
   `C:\Projetos\carteira-investimentos`, incluindo worktrees registradas em
   `C:\Projetos\carteira-investimentos.worktrees\`. Nunca leia, pesquise,
   compare ou reutilize `C:\Projetos\carteira-2.0`.
2. Carregue e use `Superpowers` como a primeira Skill, antes de qualquer outra
   Skill especializada.
3. Descubra o inventário real em
   `C:\Projetos\carteira-investimentos\.agents\skills`; selecione apenas o
   conjunto mínimo relevante e reavalie se o escopo mudar.
4. Siga `docs/SKILLS_ROUTING.md` para agente/modelo, justificativa da escolha,
   fallback, limites e campos de relatório. Esta preferência não permite
   alegar que um provider/modelo foi usado quando ele não estiver disponível.
5. Use a documentação versionada do repositório como continuidade durável,
   não o histórico de chat. A memória canônica de projeto permanece
   `docs/ai/PROJECT_MEMORY.md`.
6. `MERGE_AUTHORIZATION=false` por padrão. Merge, squash merge e auto-merge
   exigem autorização humana explícita e inequívoca para a PR identificada.

O handoff deve registrar `SKILLS_CONSIDERED`, `SKILLS_USED`,
`SKILLS_NOT_USED`, `SKILL_SELECTION_REASON`, `SKILL_REEVALUATED` e
`SKILL_GAPS_FOUND`, além do agente/modelo recomendado e motivo da escolha.

## AGENT STARTUP PROTOCOL

Ao iniciar uma tarefa relevante neste repositório:

1. Leia este arquivo e `docs/ai/PROJECT_MEMORY.md`.
2. Consulte `docs/ai/SKILLS.md` e `docs/ai/SKILL_ROUTER.md`.
3. Confirme workspace, branch, HEAD, `origin/main` e working tree.
4. Use primeiro Superpowers; descubra Skills locais e classifique a missão
   conforme `docs/SKILLS_ROUTING.md` e `docs/ai/SKILL_ROUTER.md`.
5. Selecione somente o menor conjunto relevante; reavalie se a categoria mudar.
6. Execute a mudança com escopo controlado e preserve áreas protegidas.
7. Valide com os testes, build e navegador aplicáveis.
8. Registre decisões duradouras na memória/documentação apropriada.

## PROJECT BOOTSTRAP

Before doing ANY work in this repository:

1. Read `docs/ai/PROJECT_STATE.md`.
2. Read `docs/ai/NEXT_STEP.md`.
3. Read `docs/ai/VISUAL_CANON.md` for UI work.
4. Read `docs/ai/ARCHITECTURE_MAP.md` for code work.
5. Read `docs/ai/PRODUCT_CONTRACTS.md` before financial or data changes.
6. Read `docs/ai/TESTING_AND_RELEASE.md` before PR or release work.

Do not rely on chat history as source of truth. Repository documentation is
authoritative unless proven stale by Git or code evidence.

DO NOT MIX WITH `C:\Projetos\carteira-2.0`. They are independent projects.

Before UI work:

1. Read `docs/ai/VISUAL_CANON.md`.
2. Open both files in `Refs/visual-canon/`.
3. Treat the screenshots as final visual targets.
4. Do not reinterpret the approved design.

Fontes canônicas: arquitetura em `docs/ai/ARCHITECTURE.md`, estado e decisões
em `docs/ai/PROJECT_MEMORY.md`, mapa de Skills em `docs/ai/SKILLS.md`,
roteamento de Skills em `docs/ai/SKILL_ROUTER.md`,
roteamento de Agentes em `docs/ai/AGENT_ROUTER.md`,
autonomia em `docs/ai/AGENT_AUTONOMY.md`.

## Princípios Caveman (Governança)

- Mudanças mínimas; preferir alterações pontuais e verificáveis.
- Simplicidade acima de elegância abstrata.
- Evitar complexidade desnecessária, dependências novas ou abstrações sem
  motivo.
- Preservar dados existentes (carteira, proventos, renda fixa, metas, backup).
- Rollback fácil: cada mudança deve poder ser revertida de forma simples.
- Não reconstruir funções estáveis a cada fase.
- Uma mudança por objetivo; diffs pequenos e temáticos.
- Preferir extrações pequenas e reversíveis sobre reescritas amplas.

## Princípios Impeccable (Qualidade)

- Auditar antes e depois da mudança.
- Verificar qualidade de código, clareza e consistência.
- Acessibilidade (foco, contraste, leitura por leitor de tela).
- Responsividade (390, 430, 768, 1366, 1920).
- Performance (sem recálculo redundante, sem listener órfão).
- Riscos (dados, persistência, compatibilidade).
- Regressões (manuais e funcionais).
- Testar somente os arquivos diretamente relacionados com a mudança e também as
  suites gerais exigidas pela fase, pelo `docs/project-phases-roadmap.md` ou pela
  governança do projeto (build, `npm.cmd test`, smoke/guard documental quando
  aplicável). Esta regra não pode ser usada para pular testes, builds ou guards
  obrigatórios.
- Revisar o diff completo antes de commit.

## Interface Design

Em mudanças visuais, revisar:

- Hierarquia visual e ordem de leitura.
- Tipografia (tamanhos, pesos, fluência da fonte).
- Contraste (legibilidade em claro e escuro).
- Espaçamento e densidade.
- Comportamento em mobile (390/430) e desktop (1366/1920).
- Excesso de cards, bordas, brilhos, sombras e gradientes.

## Playwright

Após mudanças visuais, validar obrigatoriamente:

- 390px, 430px, 768px, 1366px, 1920px.
- Navegação principal e secundária.
- Filtros, abas, ordenações, expansões.
- Overflow horizontal (proibido).
- Console (sem erro vermelho novo).
- Page errors e request failures (somente relevantes).
- Fluxos diretamente alterados.

## Governança Git

- Uma branch por objetivo.
- Uma PR por objetivo.
- Não misturar documentação, visual e funcional na mesma PR.
- Em uma fase já autorizada, analysis, implementação, testes, browser validation,
  commit, push, PR e correções legítimas de CI podem ocorrer autonomamente quando
  forem parte natural do gate da fase. Consulte `docs/ai/AGENT_AUTONOMY.md`.
- Merge e deploy manual continuam gates separados e exigem autorização explícita.
- Não fazer deploy manual sem autorização.
- Não iniciar a próxima fase automaticamente.
- Sempre encerrar documentalmente as fases funcionais antes da próxima.
- Squash merge obrigatório.
- Não usar force push sem autorização explícita.
- Não trabalhar na mesma branch simultaneamente em duas máquinas.

## Troca entre notebook e computador

Antes de trabalhar (notebook ou computador):

```powershell
git switch main
git pull --ff-only origin main
git status
```

Ao continuar uma branch remota existente:

```powershell
git fetch origin
git switch --track origin/NOME-DA-BRANCH
```

Antes de trocar de máquina:

- Working tree limpo.
- Commit criado localmente.
- Branch enviada para `origin` (`git push`).
- PR draft aberta quando aplicável.
- Nunca deixar trabalho importante somente local.
- Nunca copiar manualmente a pasta do projeto entre máquinas; usar Git.

## Regras Windows

- Usar `npm.cmd` ou `cmd /c npm` ao invés de `npm` cru no PowerShell.
- Não usar `Set-ExecutionPolicy Unrestricted`.
- Não rodar `npm audit fix` fora de fase específica autorizada.
- Não expor tokens, credenciais ou dados reais no chat ou em código.
- Não pedir que o usuário envie tokens pelo chat.
- Agentes não podem executar `git credential fill`, `git credential-manager get`
  ou comandos equivalentes para extrair tokens ou senhas armazenados.
- Agentes não podem ler, imprimir, copiar, transformar ou reutilizar credenciais
  do Windows Credential Manager, do Git credential helper ou de qualquer outro
  cofre do sistema.
- A autenticação deve ocorrer somente pelos fluxos normais e interativos do Git,
  GitHub Desktop ou ferramenta oficialmente conectada ao repositório.
- Se uma operação exigir autenticação indisponível, realizar apenas a parte
  possível e reportar a limitação ao usuário.
- Nunca contornar falta de `gh`, de token ou de autenticação extraindo
  credenciais armazenadas.

## Áreas protegidas

Não alterar sem autorização explícita e fase específica:

- Fórmulas financeiras.
- Dados históricos persistidos.
- Schema, persistência, localStorage ou equivalente.
- Firebase, Auth, sincronização, backups.
- `firestore.rules`.
- `sw.js`.
- `manifest.json`.
- `finance-core.js`.
- `persistence-core.js`.
- `modern/src`.
- `modern/dist`.
- Lógica de "zero versus ausência".

## Frontend moderno

- O frontend moderno continua somente leitura.
- `modern/dist` deve permanecer fora do índice (`git ls-files modern/dist`
  retorna vazio).
- Não migrar telas automaticamente para o moderno.
- Não alterar o bridge legado/moderno sem fase própria.
- Não substituir o legado sem paridade funcional comprovada e autorização.

## Estado atual

O estado factual de branch, SHA, PRs e fases deve ser consultado no Git e em
`docs/ai/PROJECT_MEMORY.md` / `docs/project-phases-roadmap.md`. Este bootstrap
não conserva snapshots históricos de fases.

## Modularização futura da `index.html`

Regra para quando essa modularização vier a ser autorizada:

- Reduzir o `index.html` gradualmente, em extrações pequenas.
- Uma extração por fase; sem reconstrução ampla.
- Não começar por Firebase, sincronização, persistência ou estado global.
- Preservar comportamento visível e dados.
- Testes antes e depois de cada extração.
- Rollback simples e comprovado.
- Comparar visual e funcionalmente antes e depois.

## Regra de parada

Sempre parar e pedir autorização explícita antes de:

- Commit.
- Push.
- Abrir PR.
- Marcar Ready.
- Merge.
- Deploy.
- Iniciar nova fase.
- Mudança de schema.
- Alteração de persistência.
- Instalação de dependência.

## Lifecycle de worktrees e artefatos

- Checkout canônico único: `C:\Projetos\carteira-investimentos`.
- Novas worktrees Git devem ficar em
  `C:\Projetos\carteira-investimentos.worktrees\<nome>`; a pasta interna
  `.worktrees` é legado para novas criações, embora o conteúdo existente
  permaneça até auditoria individual.
- Nomear worktrees funcionais como `vNNN-curto-escopo`; manter no máximo uma
  worktree ativa por branch de funcionalidade.
- Após merge certificado, verificar PR/SHA em `origin/main`, commits exclusivos
  (incluindo equivalência quando o merge foi squash), branch/PR dependentes,
  status rastreado e não rastreado, evidências referenciadas e processos ativos.
  Só então executar `git worktree remove` normal no caminho absoluto validado.
- Se a remoção normal falhar, não usar `--force`, `Remove-Item -Recurse`,
  `git clean` ou limpeza manual; preservar o resíduo e reportar o caminho.
- Não apagar branches locais/remotas em lote. Branch não incorporada ou com
  commits exclusivos fica preservada; branches remotas nunca são removidas por
  housekeeping automático.
- Pastas órfãs só podem ser removidas quando forem comprovadamente vazias ou
  artefatos regeneráveis sem evidência/arquivo de usuário, fora do registro de
  worktrees e sem processo dependente. Dúvida implica preservar.
- Proteger `backups-seguros`, `local-imports`, `Refs`, `output`, fixtures,
  exports financeiros, configuração, screenshots manuais e evidência QA.
  `dist`, `coverage`, `test-results` e caches só são descartáveis após verificar
  que são gerados e não são a única prova de um problema aberto.
- Em falha de remoção, confirmar separadamente registro Git e presença física;
  nunca presumir que ambos foram removidos juntos.

---

**Referências obrigatórias para decisões de ferramentas e fluxo:**

- Skill Router: `docs/ai/SKILL_ROUTER.md`
- Agent Router: `docs/ai/AGENT_ROUTER.md`
- Agent Autonomy: `docs/ai/AGENT_AUTONOMY.md`
- Project Memory: `docs/ai/PROJECT_MEMORY.md`
- Skills Inventory: `docs/ai/SKILLS.md`
- Project Rules: `docs/ai/PROJECT_RULES.md`
- Decisions: `docs/ai/DECISIONS.md`
- Financial Rules: `docs/ai/FINANCIAL_RULES.md`

Para a plataforma de trabalho V192, consulte também somente quando o tipo de
tarefa exigir:

- Princípios: `docs/ai/ENGINEERING_PRINCIPLES.md`
- Arquitetura resumida: `docs/ai/ARCHITECTURE_MEMORY.md`
- Semântica financeira: `docs/ai/FINANCIAL_SEMANTICS.md`
- QA: `docs/ai/QA_PLAYBOOK.md`
- Release: `docs/ai/RELEASE_PLAYBOOK.md`
- Roteamento de Skills: `docs/ai/SKILL_ROUTING.md`
- Manifesto/versionamento de ferramentas: `docs/ai/SKILLS_MANIFEST.md`
- Decisões V192: `docs/ai/DECISIONS_V192.md`

`DESIGN.md` é a fonte visual do projeto. Memória Git-tracked é a fonte de
verdade; qualquer índice MCP é derivado e não autoriza alterações.

Até nova orientação, este `AGENTS.md` não substitui nem altera qualquer
documento oficial existente: ele somente consolida as regras que Hermes,
Codex e outros agentes devem seguir no fluxo diário.

## V197 compact boot contract

Toda sessão deve executar primeiro o PROJECT IDENTITY GATE, ler `AGENTS.md`,
`docs/ai/PROJECT_MEMORY.md`, `docs/ai/NEXT_STEP.md`, `docs/ai/DECISIONS.md` e
`docs/ai/SKILL_ROUTER.md`, descobrir Skills em `.agents/skills`, sempre
considerar Superpowers, selecionar o menor conjunto relevante, executar,
validar delta e atualizar `NEXT_STEP.md`. O router versionado em
`docs/ai/SKILL_ROUTER.md` é suficiente; `.agents/SKILL_ROUTER.md`, se existir,
é somente uma bridge local e nunca é requisito do boot.

Precedência: AGENTS.md → semântica protegida → gates humanos → segurança
financeira/persistência/Git → PROJECT_MEMORY → DECISIONS → SKILL_ROUTER →
SKILL.md → preferência da missão. Superpowers nunca autoriza writes, merge,
deploy ou mudança protegida.

Políticas: `MANDATORY_FIRST_SKILL=Superpowers`,
`MINIMUM_RELEVANT_ADDITIONAL_SKILLS=true`, `REUSE_GREEN_EVIDENCE=true`,
`SAME_FAILURE_TWICE=PIVOT` e `FUTURE_MISSIONS_DO_NOT_REPEAT_STABLE_GOVERNANCE=true`.

## PERMANENT SKILLS POLICY — SUPERPOWERS_FIRST

`MANDATORY_FIRST_SKILL=Superpowers`.

Antes de implementar, investigar, depurar, revisar código, fazer QA,
refatorar ou planejar uma mudança técnica, qualquer executor deve confirmar a
identidade do projeto e carregar/usar Superpowers primeiro. Em seguida deve
ler a memória canônica, descobrir as Skills reais em `.agents/skills` e
selecionar somente as especializadas relevantes, conforme
`docs/SKILLS_ROUTING.md`.

Se a categoria mudar, registrar `SKILL_REEVALUATED=true` e reavaliar. Não
inventar Skills nem ampliar escopo por causa de uma Skill. Superpowers é uma
camada de processo, não autorização para merge, deploy, cloud writes,
alterações financeiras, persistência, schema, secrets, force push ou Git
destrutivo. A autorização da missão e os contratos do projeto prevalecem.

Esta política é independente de chat, memória de sessão, modelo ou executor;
Codex, Hermes, OpenCode e agentes genéricos convergem para estes arquivos. Se
Superpowers não estiver disponível, registrar `SKILL_GAPS_FOUND`, explicar a
limitação e só então usar o melhor fallback de processo disponível.

Handoff mínimo: `SKILLS_DISCOVERED`, `SUPERPOWERS_AVAILABLE`,
`SUPERPOWERS_USED`, `SKILLS_CONSIDERED`, `SKILLS_USED`, `SKILLS_NOT_USED`,
`SKILL_SELECTION_REASON`, `SKILL_REEVALUATED`, `SKILL_GAPS_FOUND`.

Detalhes: [`docs/SKILLS_ROUTING.md`](docs/SKILLS_ROUTING.md).
