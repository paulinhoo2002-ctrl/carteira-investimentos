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

## Não roteáveis por padrão

Backups e `references` são material auxiliar. Skills de marketing, Browser Use
Cloud, Composio e serviços pagos não entram no fluxo normal deste projeto.

