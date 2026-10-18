# Skill Router — Carteira LEGACY

Este é o ponto canônico de seleção de Skills. Um agente sem histórico de chat
deve primeiro confirmar a identidade do repositório em `AGENTS.md`, ler o
contrato operacional permanente e então classificar a missão abaixo. O seletor
`scripts/qa/select-skills.js` descobre Skills versionadas em `.agents/skills/`;
Skills do runtime só entram quando o executor as informa explicitamente.

## Ordem permanente

1. PROJECT IDENTITY GATE e limites de segurança de `AGENTS.md`.
2. Superpowers `using-superpowers`, quando instalado no runtime.
3. Ponytail full e Caveman conforme o contrato do projeto.
4. Classificar a missão e carregar apenas as Skills selecionadas que existam.

Superpowers, Ponytail e Caveman são processo/modo, não substitutos para Skills
de domínio. A seleção não instala nem executa Skill, não escolhe modelo e não
concede autorização. Se o escopo mudar, classifique de novo e registre
`SKILL_REEVALUATED=true`.

## Inventário portátil e disponibilidade

Os 17 arquivos `SKILL.md` rastreados no clone limpo são a base portável. Para
cada linha, o caminho é `.agents/skills/<Skill>/SKILL.md`; a tabela também
registra propósito/domínio, estado, sobreposição e uso seguro:

| Skill | Domínio e propósito | Status | Sobreposição | Referência/uso seguro |
|---|---|---|---|---|
| `archify` | Arquitetura; diagramas e documentação visual | Ativa | Complementa arquitetura/governança | Opcional por gatilho; usar se diagrama ajudar |
| `banner-design` | Visual; banners e peças gráficas | Ativa, especializada | Não necessária para UI comum | Não roteada; segura só em trabalho de banner autorizado |
| `brand` | Marca e identidade visual | Ativa, especializada | Sobrepõe `frontend-design` | Não roteada; usar só em tarefa de marca autorizada |
| `browser-testing-with-devtools` | QA; inspeção via DevTools | Ativa, condicional | Complementa Playwright | Opcional com gatilho `devtools`; segura para diagnóstico |
| `cavecrew` | Delegação independente | Condicional | Sobrepõe execução sequencial | Não roteada; usar só com subtarefas independentes disponíveis |
| `caveman-commit` | Git; mensagens de commit | Ativa | Complementa revisão | Opcional por gatilho, somente com commit autorizado |
| `caveman-compress` | Compactação de contexto/documentos | Ativa, alto impacto em arquivo | Não substitui revisão documental | Não roteada; exige escopo explícito do arquivo alvo |
| `caveman-review` | Revisão de diff e governança | Ativa | Sobrepõe revisores genéricos | Roteada em GOVERNANCE/RELEASE; segura para revisão |
| `caveman` | Comunicação concisa e mudanças mínimas | Ativa | Processo, não domínio | Usar conforme política do projeto |
| `design-system` | Tokens e padrões de UI | Ativa | Complementa `interface-design` | Roteada em DESIGN_SYSTEM; segura em escopo visual autorizado |
| `doubt-driven-development` | Finanças, segurança, integridade e incerteza | Ativa | Skill de domínio | Roteada em finanças/segurança; preservar evidência e limites |
| `frontend-design` | Direção visual ampla | Ativa, condicional | Sobrepõe `interface-design` | Não roteada; só para nova direção visual autorizada |
| `interface-design` | UX, hierarquia e layout | Ativa | Complementa `design-system` | Roteada em UI_UX/RESPONSIVE; segura em escopo visual autorizado |
| `interview-me` | Descoberta de requisitos | Ativa, condicional | Pode atrasar pedido já claro | Não roteada; só quando fontes do projeto não resolverem ambiguidade |
| `playwright` | Browser QA e validação responsiva | Ativa | Evita harness redundante | Roteada em RESPONSIVE/BROWSER_QA; usar com dados sintéticos/escopo aprovado |
| `slides` | Apresentações | Ativa, especializada | Fora do ciclo de produto | Não roteada; segura apenas para apresentação solicitada |
| `source-driven-development` | Fontes oficiais e evidência | Ativa, condicional | Complementa análise de incerteza | Roteada em reconciliação/IR2026; não inventar fontes |

Skills disponíveis só no host/runtime não são portáveis. O inventário deste
host no checkout canônico observou 42 diretórios: 40 com `SKILL.md` e dois sem
ele (`archify-main`, `references`); esses diretórios locais não passam a
ser dependências do projeto. `browser-harness` e `browser-harness-main` têm
nome interno repetido e não devem ser roteados em duplicidade. Quatro Skills
`carteira-*` são exclusivas de outro produto e ficam fora do LEGACY;
`planning-with-files` também declara escopo do outro produto. `ui-styling`
exige shadcn/Tailwind, que não é a stack LEGACY. `caveman-stats` depende de
hooks/logs de outro runtime. Diretórios sem `SKILL.md`, cópias e Skills com
dependência ausente são `UNAVAILABLE` para roteamento. Nenhum arquivo é
apagado por esta classificação.

Inventário não portável deste host (paths sob `.agents/skills/<nome>`; estes
itens não são pré-requisitos nem entram na seleção automática):

| Skill/diretório | Propósito/domínio | Estado e referência de governança | Uso seguro no LEGACY |
|---|---|---|---|
| `archify-main` | Cópia upstream para diagramas | Sem `SKILL.md`; não roteada | Não |
| `browser-harness` | Automação de browser/CDP | Host-local; nome interno duplicado; não roteada | Só após identificar versão/runtime |
| `browser-harness-main` | Cópia upstream de browser harness | Host-local; nome interno duplicado; não roteada | Não automaticamente |
| `carteira-auditoria-real` | Auditoria financeira específica | Fora do escopo LEGACY; não roteada | Não |
| `carteira-checkpoint-git` | Checkpoint Git específico | Fora do escopo LEGACY; não roteada | Não |
| `carteira-finance-core-review` | Revisão de Finance Core específica | Fora do escopo LEGACY; não roteada | Não |
| `carteira-migracao-segura` | Migração específica | Fora do escopo LEGACY; não roteada | Não |
| `caveman-help` | Ajuda de uso Caveman | Host-local; não roteada | Sim, somente consulta |
| `caveman-stats` | Estatísticas de uso/hook | Depende de hooks de outro runtime; não roteada | Não neste runtime |
| `deep-research` | Pesquisa multifuente | Host-local; não roteada | Condicional após avaliar fonte/custo |
| `design` | Design visual amplo | Host-local; sobrepõe Skills visuais portáveis | Condicional, escopo visual autorizado |
| `fact-checker` | Verificação de afirmações | Host-local; não roteada | Condicional, runtime disponível |
| `impeccable` | Polish visual | Host-local; sobrepõe `interface-design` | Condicional, escopo visual autorizado |
| `impeccable.bak` | Cópia de backup da Skill `impeccable` | Contém SKILL.md duplicado; não roteada | Não automaticamente |
| `mantis-architecture` | Análise de arquitetura | Host-local; sobrepõe `doubt-driven-development`/`archify` | Condicional, após ler e avaliar limites |
| `mantis-critic` | Crítica de artefatos | Host-local; não roteada | Condicional, após ler e avaliar limites |
| `mantis-report` | Relatórios | Host-local; sobrepõe `caveman-review` | Condicional, após ler e avaliar limites |
| `mantis-review` | Revisão | Host-local; sobrepõe `caveman-review` | Condicional, após ler e avaliar limites |
| `mantis-structural-index` | Índice estrutural | Host-local, referência auxiliar ausente; não roteada | Não até dependência ser resolvida |
| `mantis-threat-model` | Modelagem de ameaças | Host-local; sobrepõe `doubt-driven-development` | Condicional para threat modeling |
| `planning-with-files` | Planejamento em arquivos | Declara escopo do outro produto; não roteada | Não |
| `references` | Material auxiliar compartilhado | Sem `SKILL.md`; não é Skill | Não como Skill |
| `source-tracker` | Registro local de fontes | Host-local; não roteada | Condicional, após verificar destino/dados |
| `ui-styling` | Implementação shadcn/Tailwind | Stack incompatível com LEGACY; não roteada | Não para este produto |
| `ui-ux-pro-max` | Sistema de design amplo | Host-local; sobrepõe `interface-design`/`design-system` | Condicional, somente necessidade demonstrada |

As Skills `using-superpowers`, `systematic-debugging`,
`verification-before-completion`, `firebase-security-rules-auditor` e
`find-skills` são aliases de runtime opcionais definidos em
`docs/ai/skills-routing.json`. Só podem ser selecionadas se aparecerem na
disponibilidade informada pelo runtime; um nome catalogado não prova instalação.

## Classificação e conjunto mínimo

| Classe | Skills mínimas | Gatilhos/limites |
|---|---|---|
| `UI_UX` | `interface-design` | Tokens compartilhados: adicionar `design-system`; validar no browser: `playwright` |
| `RESPONSIVE` | `interface-design`, `playwright` | Seguir matriz 390/430/768/1366/1920 de `AGENTS.md` |
| `BROWSER_QA` | `playwright` | `browser-testing-with-devtools` somente com diagnóstico DevTools explícito |
| `DESIGN_SYSTEM` | `design-system` | `interface-design` para padrão novo de tela |
| `FINANCE_CORE` | `doubt-driven-development` | Preservar contratos financeiros; fonte oficial pode adicionar `source-driven-development` |
| `FINANCIAL_RECONCILIATION` | `doubt-driven-development`, `source-driven-development` | Dry-run, proveniência e cobertura; nunca preencher lacunas |
| `IR2026` | `doubt-driven-development`, `source-driven-development` | Fiscal exige fonte/autorização; histórico não certificado permanece analítico |
| `PRIVACY_SECURITY` | `doubt-driven-development` | Auditor de regras Firebase só se disponível e escopo envolver regras |
| `RELEASE` | `caveman-review` | Verificação/commit entram só por gatilho e autorização próprios |
| `GOVERNANCE` | `caveman-review` | `archify` somente quando um diagrama for útil |
| `ARCHITECTURE` | `doubt-driven-development` | `archify` somente para representação visual necessária |
| `WORKSPACE_CLEANUP` | `caveman-review` | Preservar arquivos/worktrees desconhecidos; não implica exclusão |
| `BACKUP_RECOVERY` | `doubt-driven-development`, `caveman-review` | Sem export/restore real sem autorização explícita |
| `PRODUCTION_INCIDENT` | `doubt-driven-development` | `systematic-debugging` se disponível; não repetir a mesma tentativa |
| `SKILL_DISCOVERY` | `find-skills` se disponível | Descoberta física local é obrigatória; instalação nunca é automática |

Aliases legados de categorias ficam apenas no JSON para compatibilidade. O
classificador textual serve como sugestão determinística e deve falhar para
`GOVERNANCE` quando não reconhecer um pedido; o executor confirma a categoria
com base no escopo e nos contratos do repositório.

## Contratos visuais que a rota UI deve localizar

`SLIM_UI_CONTRACT`, `RESPONSIVE_CONTRACT`, `ACCESSIBILITY_CONTRACT` e
`DESIGN_SYSTEM` são encontrados nos documentos existentes abaixo; não são
nomes assumidos de Skills nem exigem arquivos separados.

- Slim UI e comportamento aprovado: `docs/ai/VISUAL_CANON.md` e
  `docs/ai/VISUAL_CANON_V2.md`.
- Responsividade: matriz e regras de overflow em `AGENTS.md`; princípios
  visuais também em `docs/ai/VISUAL_CANON_V2.md`.
- Acessibilidade: requisitos de foco, contraste, teclado, leitores de tela e
  alvos de toque em `AGENTS.md`, mais os critérios do `docs/ai/VISUAL_CANON.md`.
- Design system: `docs/ai/DESIGN_SYSTEM.md`.
- Contrato agregador canônico: `docs/ai/VISUAL_UX_RESPONSIVE_CONTRACT.md` (viewports, tipografia, progressive disclosure, acessibilidade e limites financeiros). `PROJECT_STATE.md` registra se há fase visual limitada ativa; revalide branch/PR/HEAD antes de usar Skills de UI. A seleção não depende desse arquivo para funcionar.

Nenhum contrato visual autoriza redesign por si só. Respeite `VISUAL_PHASE`,
`FEATURE_FREEZE`, `DESIGN.md` e a autorização específica da missão.

## Zero-chat examples

- “Improve Ativos responsive UI” → `RESPONSIVE` → `interface-design` +
  `playwright`; consultar identidade, contratos visuais, semântica protegida e
  matriz de viewports antes de alterar código.
- “Investigate IR2026 fiscal blocker” → `IR2026` →
  `doubt-driven-development` + `source-driven-development`; buscar evidência
  fiscal, preservar `UNKNOWN != ZERO` e não escrever dados.

As saídas obrigatórias de cada missão são
`SKILLS_CONSIDERED`, `SKILLS_USED`, `SKILLS_NOT_USED`,
`SKILL_SELECTION_REASON`, `SKILL_REEVALUATED` e `SKILL_GAPS_FOUND`. A lista
física descoberta, o resultado e a disponibilidade de runtime devem ser
distintos no relatório.
