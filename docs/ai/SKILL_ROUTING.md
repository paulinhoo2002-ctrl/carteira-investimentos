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

## Superpowers — rota aprovada, não operacional neste momento

Superpowers (`obra/superpowers`) pode ser usado como camada de workflow quando
estiver instalado e habilitado no Hermes. No estado V193, a instalação está
bloqueada pelo security scan; portanto estas rotas são prescritivas para uma
futura instalação aprovada, não uma afirmação de disponibilidade atual.

| Tipo de missão | Rota recomendada |
|---|---|
| requisito grande ou ambíguo | Superpowers + `interview-me` ou `source-driven-development` |
| bug complexo | workflow de debugging do Superpowers + `doubt-driven-development` quando houver risco financeiro/persistência |
| mudança arquitetural | planejamento do Superpowers + `source-driven-development` |
| refatoração em múltiplas etapas | planejamento/execution workflow do Superpowers + uma Skill de domínio |
| correção orientada a testes | workflow TDD do Superpowers + Skill de testing aplicável |
| release/CI | Superpowers pode organizar a execução; `RELEASE_PLAYBOOK.md` continua autoritativo |
| UI | Superpowers + `interface-design`, respeitando `DESIGN.md` |

### Precedência obrigatória

1. regras do sistema e segurança;
2. governança do projeto;
3. semântica financeira e persistência;
4. restrições explícitas da missão;
5. memória e decisões do projeto;
6. workflow do Superpowers;
7. recomendações genéricas de Skills.

Superpowers nunca pode alterar autoridade manual de renda fixa, converter
indisponível em zero, bypassar preview/dedupe/confirm de importação, habilitar
realização automática de eventos, executar escrita real durante QA ou remover
gates de merge/deploy.

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

