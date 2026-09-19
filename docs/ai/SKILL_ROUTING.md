# Roteamento curado de Skills

O conjunto padrão deve ser pequeno. Carregue no máximo duas Skills normalmente;
uma terceira só quando a prova cruzada for indispensável.

| Tipo de tarefa | Rota padrão | Observação |
|---|---|---|
| entendimento do repositório/arquitetura | `source-driven-development` + memória Git | não indexar segredos/artefatos |
| bug incerto/financeiro/persistência | `doubt-driven-development` | obrigatório antes de consolidar mudança |
| UI de produto | `interface-design` | respeitar `DESIGN.md` e contratos de tela |
| direção visual nova | `frontend-design` | track exclusivo, não combinar com polish |
| polish/acessibilidade visual | `impeccable` | somente depois da direção definida |
| browser QA/E2E | `playwright` ou `browser-harness` | escolher a ferramenta que já controla a sessão |
| diagnóstico DOM/console/rede | `browser-testing-with-devtools` | usar sob demanda |
| qualidade web/performance | `web-quality-audit` | somente com auditoria baseada em evidência |
| segurança Firebase/Auth/Firestore | `firebase-security-rules-auditor` | audita; não concede deploy |
| revisão final | `caveman-review` | escopo, simplicidade, riscos e arquivos |
| documentação/diagrama | `archify` | apenas se diagrama reduzir ambiguidade |

## Contexto padrão

`source-driven-development`, `doubt-driven-development` e `interface-design`
ficam disponíveis por categoria, não carregados todos ao mesmo tempo.

## Sob demanda

`playwright`, `browser-harness`, `browser-testing-with-devtools`,
`web-quality-audit`, `firebase-security-rules-auditor`, `impeccable`,
`frontend-design`, `archify` e `caveman-review` são ativados somente quando o
tipo de tarefa exigir.

## SUPERPOWERS_FIRST permanente

`SUPERPOWERS_FIRST=true` e `SUPERPOWERS_REQUIRED_IF_AVAILABLE=true`.

Boot transversal: `identity → AGENTS.md → PROJECT_MEMORY.md →
docs/SKILLS_ROUTING.md → descoberta → Superpowers → Skills especializadas →
execução → testes → revisão → QA → handoff`.

Superpowers é a camada-base quando disponível. Skills são escolhidas pelo
problema, em conjunto mínimo, e não ampliam autorização. Merge, deploy,
Firebase/OAuth, cloud writes, finanças, persistência, schema, secrets, force
push e remoção destrutiva continuam protegidos pelos contratos do projeto e
pela autorização explícita da missão.

Se a natureza da missão mudar, registrar `SKILL_REEVALUATED=true` e recalcular
o conjunto. Se Superpowers não existir, usar o fallback disponível e registrar
`SUPERPOWERS_AVAILABLE=false`.

Todo handoff informa: `SKILLS_DISCOVERED`, `SUPERPOWERS_AVAILABLE`,
`SUPERPOWERS_USED`, `SKILLS_CONSIDERED`, `SKILLS_USED`, `SKILLS_NOT_USED`,
`SKILL_SELECTION_REASON`, `SKILL_REEVALUATED`, `SKILL_GAPS_FOUND`.

## Não roteáveis por padrão

Backups e `references` são material auxiliar. Skills de marketing, Browser Use
Cloud, Composio e serviços pagos não entram no fluxo normal deste projeto.

