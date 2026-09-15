# Catálogo operacional de Skills

Este catálogo traduz o inventário físico de `.agents/skills/` em decisões
práticas para este projeto. Skills são instruções de trabalho; não concedem
autorização para alterar dados financeiros, persistência, Firebase, deploy ou
dependências.

## Inventário reconciliado

- 26 Skills operacionais reais com `SKILL.md`.
- `archify-main` e `browser-harness-main`: cópias upstream de referência.
- `impeccable.bak`: backup; não usar como fonte operacional.
- `references`: material auxiliar, não Skill.
- `deploy-to-vercel`: disponível, mas somente sob pedido explícito de deploy.
- `find-skills`: Skill global de descoberta; não é uma pasta física deste site.

## Roteamento por momento do projeto

| Momento | Skill(s) | Ajuda principal | Limite |
|---|---|---|---|
| Missão grande / capacidade ausente | `find-skills` | descobrir capacidade local ou lacuna | não instalar automaticamente |
| Entender documentação, API ou versão | `source-driven-development` | usar fonte oficial e versão verificável | não substituir silenciosamente regras do produto |
| Financeiro, importação, datas, arredondamento | `doubt-driven-development` + `source-driven-development` | revisão adversarial e evidência primária | nunca criar fórmula paralela |
| Persistência, recovery, backup ou migração | `doubt-driven-development` + `caveman-review` | invariantes, rollback, simplicidade e risco | não alterar schema/persistência sem fase/autorização |
| Firebase, Auth, Firestore, cloud/local ou protected write | `firebase-security-rules-auditor` + `doubt-driven-development` | privilégio mínimo, listener, writeback e conflito | auditoria não autoriza escrita/deploy |
| Nova direção visual | `frontend-design` | linguagem visual, composição e identidade | não misturar com outra trilha visual na mesma fase |
| Implementar/refinar tela de produto | `interface-design` | hierarquia, layout, estados e densidade útil | preservar Visual Canon e lógica financeira |
| Acabamento de tela pronta | `impeccable` | contraste, tipografia, spacing, a11y e polish | não redesenhar a tela |
| Design system real | `design-system` | tokens, escalas e especificação de componentes | usar somente se tokens/componentes mudarem |
| UI shadcn/Tailwind | `ui-styling` | componentes acessíveis e temas | não se aplica automaticamente à SPA legada |
| Design system amplo / pesquisa UX | `ui-ux-pro-max` | padrões, dashboards, gráficos e heurísticas | sob demanda; não substituir as trilhas de UI |
| Acessibilidade, performance, SEO e qualidade web | `web-quality-audit` | auditoria baseada em evidência | não confundir com certificação financeira |
| Automação/E2E real | `browser-harness` + `playwright` | CDP, navegação, viewports e provas repetíveis | usar perfil QA canônico; nunca copiar credenciais |
| Diagnóstico de runtime browser | `browser-testing-with-devtools` | DOM, console, rede e eventos | exige MCP DevTools configurado; não substitui Playwright |
| Diagramas e fluxos | `archify` | arquitetura, sequência, estado e dataflow | somente quando reduzir ambiguidade |
| Pedido ambíguo | `interview-me` | descobrir objetivo e critérios | não usar em loops/CI |
| Delegação de subagentes | `cavecrew` | decidir se paralelização ajuda | não delegar decisão financeira final |
| Review final | `caveman-review` | escopo, risco e simplicidade do diff | não substitui testes |
| Mensagem de commit | `caveman-commit` | mensagem curta e precisa | commit continua gate separado |
| Contexto longo | `caveman-compress` | compactar documentação sem perder invariantes | nunca remover hashes, IDs ou autorizações |
| Medir tokens | `caveman-stats` | acompanhar economia de contexto | opcional |
| Ajuda sobre modos | `caveman-help` | referência rápida | não altera governança |
| Marca, banner ou apresentação | `brand`, `banner-design`, `slides`, `design` | materiais de comunicação | baixo uso; não são produto normal |
| Deploy | `deploy-to-vercel` | fluxo de publicação | somente pedido explícito; sem deploy automático |

## Regra curta de seleção

1. Escolher no máximo duas Skills normalmente, três somente quando a tarefa
   exigir prova cruzada.
2. Para UI, escolher uma trilha: `frontend-design`, `interface-design` ou
   `impeccable`; adicionar `playwright`/`web-quality-audit` conforme a prova.
3. Para dados sensíveis, incluir `doubt-driven-development`.
4. Para Firebase/Auth/cloud, incluir `firebase-security-rules-auditor`.
5. Usar `browser-harness` sempre que houver interação com navegador; usar
   `playwright` para transformar a interação em teste repetível.
6. Preferir ferramentas e processamento locais, sem APIs pagas ou custo
   recorrente, salvo autorização explícita.

## Lacunas e duplicidades

- Não há lacuna crítica para o fluxo atual de carteira, UI, browser QA,
  persistência ou Firebase.
- O MCP de Chrome DevTools não está configurado; quando necessário, usar
  `browser-harness`/Playwright e registrar a limitação.
- As cópias upstream devem permanecer apenas para referência e não devem ser
  adicionadas ao roteamento operacional.
- Não instalar novas Skills apenas por disponibilidade; primeiro confirmar a
  necessidade e a ausência de capacidade local.

## Skills externas instaladas sob guardrails

- `planning-with-files`: planejamento por missão em `.qa-state/plans/<MISSION>/`; cópia local sem hooks.
- Mantis seguro: `mantis-threat-model`, `mantis-architecture`, `mantis-structural-index`, `mantis-review`, `mantis-critic` e `mantis-report`; análise/revisão/relatório somente.
- Pesquisa: `deep-research`, `fact-checker` e `source-tracker`; scripts manuais/optional, sem cron, API paga ou serviço recorrente.
- Licenças: planning e moonlight-lupin MIT; Mantis Apache-2.0; cada skill mantém `LICENSE.txt` local.
