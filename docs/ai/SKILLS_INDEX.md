# Índice físico de Skills LEGACY

## Contagem física versus IDs (MEGA 19)

As 40 entradas diretas não são 40 Skills distintas: 38 IDs válidos únicos, uma cópia `browser-harness-main/SKILL.md` do ID já catalogado `browser-harness` (`DUPLICATE_ID_NONCANONICAL_COPY`), e `impeccable.bak/SKILL.md`, backup sem frontmatter válido (`BACKUP_INVALID_METADATA`). Ambos já estão classificados nos `recursiveCandidates` do catálogo; não instalar, sincronizar ou rotear essas cópias. Nenhuma Skill aplicável permanece sem catálogo. Os três arquivos recursivos adicionais são a cópia aninhada de `archify` e dois documentos internos sem metadados de Skill.

O catálogo [`skills-catalog.json`](skills-catalog.json) é a fonte versionada de IDs, caminhos, hashes do snapshot, disponibilidade no repositório e candidatos excluídos. Este índice é uma leitura rápida; rotas executáveis continuam em [`skills-routing.json`](skills-routing.json).

Inventário de origem observado em 2026-10-13: **43 arquivos recursivos, 38 IDs únicos válidos, 17 Skills no snapshot desta worktree**. Origem lida em modo somente leitura; hashes de origem e do snapshot Git são independentes. Runtime deve ser redescoberto em cada sessão.

| ID | Categoria | Disponibilidade | Roteamento | Finalidade (resumo) |
|---|---|---|---|---|
| `archify` | ARCHITECTURE | No snapshot versionado | TRACKED_REPOSITORY_SNAPSHOT | Create polished, validated architecture, workflow, sequence, data-flow, and lifecycle/state diagrams as explorab... |
| `banner-design` | UI_UX | No snapshot versionado | TRACKED_REPOSITORY_SNAPSHOT | Design banners for social media, ads, website heroes, creative assets, and print. Multiple art direction options... |
| `brand` | UI_UX | No snapshot versionado | TRACKED_REPOSITORY_SNAPSHOT | Brand voice, visual identity, messaging frameworks, asset management, brand consistency. Activate for branded co... |
| `browser-harness` | BROWSER_QA | Somente na origem observada | SOURCE_ONLY_RUNTIME_NOT_GUARANTEED | Always use browser-harness for any web interaction: automation, scraping, testing, or site/app work. |
| `browser-testing-with-devtools` | BROWSER_QA | No snapshot versionado | TRACKED_REPOSITORY_SNAPSHOT | Tests in real browsers via Chrome DevTools MCP. Use when building or debugging anything that runs in a browser. ... |
| `carteira-auditoria-real` | CROSS_PROJECT | Somente na origem observada | REJECTED_CROSS_PROJECT_SCOPE | Auditar fatos reais do repositório, Git, filesystem, navegador, IndexedDB e backups da Carteira 2.0. Use quando ... |
| `carteira-checkpoint-git` | CROSS_PROJECT | Somente na origem observada | REJECTED_CROSS_PROJECT_SCOPE | Criar e validar checkpoints Git seguros da Carteira 2.0. Use quando o usuário pedir checkpoint, commit, consolid... |
| `carteira-finance-core-review` | CROSS_PROJECT | Somente na origem observada | REJECTED_CROSS_PROJECT_SCOPE | Validar regras financeiras e consistência contábil da Carteira 2.0: patrimônio, caixa, BUY/SELL, preço médio, pr... |
| `carteira-migracao-segura` | CROSS_PROJECT | Somente na origem observada | REJECTED_CROSS_PROJECT_SCOPE | Conduzir preview, dry-run, plano, importação e rollback do legado para a Carteira 2.0 com guardas rígidas. Use p... |
| `cavecrew` | PROCESS | No snapshot versionado | TRACKED_REPOSITORY_SNAPSHOT | Decision guide for delegating to caveman-style subagents. Tells the main thread WHEN to spawn `cavecrew-investig... |
| `caveman` | PROCESS | No snapshot versionado | TRACKED_REPOSITORY_SNAPSHOT | Ultra-compressed communication mode. Cuts token usage ~75% by speaking like caveman while keeping full technical... |
| `caveman-commit` | PROCESS | No snapshot versionado | TRACKED_REPOSITORY_SNAPSHOT | Ultra-compressed commit message generator. Cuts noise from commit messages while preserving intent and reasoning... |
| `caveman-compress` | PROCESS | No snapshot versionado | TRACKED_REPOSITORY_SNAPSHOT | Compress natural language memory files (CLAUDE.md, todos, preferences) into caveman format to save input tokens.... |
| `caveman-help` | PROCESS | Somente na origem observada | SOURCE_ONLY_RUNTIME_NOT_GUARANTEED | Quick-reference card for all caveman modes, skills, and commands. One-shot display, not a persistent mode. Trigg... |
| `caveman-review` | PROCESS | No snapshot versionado | TRACKED_REPOSITORY_SNAPSHOT | Ultra-compressed code review comments. Cuts noise from PR feedback while preserving the actionable signal. Each ... |
| `caveman-stats` | PROCESS | Somente na origem observada | SOURCE_ONLY_RUNTIME_NOT_GUARANTEED | Show real token usage and estimated savings for the current session. Reads directly from the Claude Code session... |
| `deep-research` | RESEARCH | Somente na origem observada | SOURCE_ONLY_RUNTIME_NOT_GUARANTEED | Autonomous multi-step deep research engine implementing an iterative Think → Search → Extract → Synthesize → Sto... |
| `design` | UI_UX | Somente na origem observada | SOURCE_ONLY_RUNTIME_NOT_GUARANTEED | Comprehensive design skill: brand identity, design tokens, UI styling, logo generation (55 styles, Gemini AI), c... |
| `design-system` | UI_UX | No snapshot versionado | TRACKED_REPOSITORY_SNAPSHOT | Token architecture, component specifications, and slide generation. Three-layer tokens (primitive→semantic→compo... |
| `doubt-driven-development` | ENGINEERING | No snapshot versionado | TRACKED_REPOSITORY_SNAPSHOT | Subjects every non-trivial decision to a fresh-context adversarial review before it stands. Use when correctness... |
| `fact-checker` | RESEARCH | Somente na origem observada | SOURCE_ONLY_RUNTIME_NOT_GUARANTEED | Targeted claim verification pipeline. Given a factual assertion, search multiple independent sources, cross-chec... |
| `frontend-design` | UI_UX | No snapshot versionado | TRACKED_REPOSITORY_SNAPSHOT | Guidance for distinctive, intentional visual design when building new UI or reshaping an existing one. Helps wit... |
| `impeccable` | UI_UX | Somente na origem observada | SOURCE_ONLY_RUNTIME_NOT_GUARANTEED | Use when the user wants to design, redesign, shape, critique, audit, polish, clarify, distill, harden, optimize,... |
| `interface-design` | UI_UX | No snapshot versionado | TRACKED_REPOSITORY_SNAPSHOT | Use when designing, reviewing, or refining user interfaces, interaction flows, visual hierarchy, accessibility, ... |
| `interview-me` | ENGINEERING | No snapshot versionado | TRACKED_REPOSITORY_SNAPSHOT | Extracts what the user actually wants instead of what they think they should want. Achieves this through one-que... |
| `mantis-architecture` | ARCHITECTURE | Somente na origem observada | SOURCE_ONLY_RUNTIME_NOT_GUARANTEED | Synthesizes raw learnings and codebase analysis into an interlinked Markdown Knowledge Base (KB). Use at the beg... |
| `mantis-critic` | ARCHITECTURE | Somente na origem observada | SOURCE_ONLY_RUNTIME_NOT_GUARANTEED | Assesses the production viability of findings, filtering out debug-only features and assertion traps. Use when f... |
| `mantis-report` | ARCHITECTURE | Somente na origem observada | SOURCE_ONLY_RUNTIME_NOT_GUARANTEED | Generates a human-readable security review packet compiled from confirmed findings and exploit chains. Use at th... |
| `mantis-review` | ARCHITECTURE | Somente na origem observada | SOURCE_ONLY_RUNTIME_NOT_GUARANTEED | Independently reviews findings and filters out false positives. Use when consolidated findings need validation a... |
| `mantis-structural-index` | ARCHITECTURE | Somente na origem observada | SOURCE_ONLY_RUNTIME_NOT_GUARANTEED | Builds a content-addressed semantic-unit index from source code for structural context. Use when a pinned or liv... |
| `mantis-threat-model` | ARCHITECTURE | Somente na origem observada | SOURCE_ONLY_RUNTIME_NOT_GUARANTEED | Synthesizes trust boundaries, attack surfaces, and attacker profiles into a living threat model. Use as Stage B ... |
| `planning-with-files` | ENGINEERING | Somente na origem observada | SOURCE_ONLY_RUNTIME_NOT_GUARANTEED | Planejamento persistente por missão para trabalhos longos, adaptado ao padrão Carteira 2.0. |
| `playwright` | BROWSER_QA | No snapshot versionado | TRACKED_REPOSITORY_SNAPSHOT | Use when the task requires automating a real browser from the terminal (navigation, form filling, snapshots, scr... |
| `slides` | ENGINEERING | No snapshot versionado | TRACKED_REPOSITORY_SNAPSHOT | Create strategic HTML presentations with Chart.js, design tokens, responsive layouts, copywriting formulas, and ... |
| `source-driven-development` | ENGINEERING | No snapshot versionado | TRACKED_REPOSITORY_SNAPSHOT | Grounds every implementation decision in official documentation. Use when you want authoritative, source-cited c... |
| `source-tracker` | RESEARCH | Somente na origem observada | SOURCE_ONLY_RUNTIME_NOT_GUARANTEED | Persistent citation database for multi-session research. Add URLs as they're cited, dedup variants, tag by topic... |
| `ui-styling` | UI_UX | Somente na origem observada | SOURCE_ONLY_RUNTIME_NOT_GUARANTEED | Create beautiful, accessible user interfaces with shadcn/ui components (built on Radix UI + Tailwind), Tailwind ... |
| `ui-ux-pro-max` | UI_UX | Somente na origem observada | SOURCE_ONLY_RUNTIME_NOT_GUARANTEED | UI/UX design intelligence with searchable database |

## Exclusões e alertas

- `carteira-auditoria-real`, `carteira-checkpoint-git`, `carteira-finance-core-review` e `carteira-migracao-segura` descrevem fluxos da Carteira 2.0; estão registrados para rastreabilidade, mas não podem ser roteados para o LEGACY.
- Cópias upstream/backup e documentos internos sem metadados de Skill estão discriminados em `recursiveCandidates`; não são Skills operacionais.
- Para detalhes não documentados pelo frontmatter, consulte o `SKILL.md` da origem. Dependências, anti-gatilhos e risco permanecem `NOT_AUDITED`/`NOT_ASSESSED`; não inferir.
- O seletor local apenas sugere Skills disponíveis no runtime e nunca concede autorização.
