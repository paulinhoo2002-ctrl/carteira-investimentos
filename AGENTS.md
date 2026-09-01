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

## AGENT STARTUP PROTOCOL

Ao iniciar uma tarefa relevante neste repositório:

1. Leia este arquivo e `docs/ai/PROJECT_MEMORY.md`.
2. Consulte `docs/ai/SKILLS.md` e `docs/ai/SKILL_ROUTER.md`.
3. Confirme workspace, branch, HEAD, `origin/main` e working tree.
4. Selecione Skills pelo problema, não mecanicamente (ver `docs/ai/SKILL_ROUTER.md`).
5. Execute a mudança com escopo controlado e preserve áreas protegidas.
6. Valide com os testes, build e navegador aplicáveis.
7. Registre decisões duradouras na memória/documentação apropriada.

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

Até nova orientação, este `AGENTS.md` não substitui nem altera qualquer
documento oficial existente: ele somente consolida as regras que Hermes,
Codex e outros agentes devem seguir no fluxo diário.