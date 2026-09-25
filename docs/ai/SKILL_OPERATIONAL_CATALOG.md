# Catálogo operacional de Skills

Este catálogo traduz o inventário físico de `.agents/skills/` em decisões
práticas para este projeto. Skills são instruções de trabalho; não concedem
autorização para alterar dados financeiros, persistência, Firebase, deploy ou
dependências.

## Inventário reconciliado

Snapshot físico conferido em 2026-09-25:
- 42 diretórios diretos, 43 arquivos SKILL.md e 38 pacotes operacionais.
  Três SKILL.md excedentes ficam em uma cópia upstream com versões internas;
  duas pastas upstream, um backup e references não são pacotes operacionais.
- .agents/skills é majoritariamente ignorada pelo Git: somente quatro
  SKILL.md operacionais estão rastreados. O catálogo é snapshot do ambiente,
  não garantia de instalação em outros clones.
- Superpowers está disponível como plugin global nesta sessão, mas não há
  .agents/skills/superpowers/SKILL.md. Não fabricar cópia ou shim; registrar
  lacuna e usar fallback se o plugin não estiver disponível em outro ambiente.
- find-skills existe no pacote local e também pode existir globalmente.

## Inventário por categoria e ativação

| Skill | Categoria | Entrada → resultado | Dependência/limite | Estado |
|---|---|---|---|---|
| archify | ARCHITECTURE | Código/Mermaid → diagrama verificável | Representar apenas arquitetura confirmada | ACTIVE |
| banner-design | VISUAL_UX | Brief/canal → conceito de banner | `ai-artist`, `ai-multimodal`, `chrome-devtools`, `inject-brand-context.cjs` e brand guidelines citados não existem no pacote local; usar apenas referência/art direction disponível, sem alegar geração/exportação | ACTIVE_WITH_LIMITATIONS |
| brand | VISUAL_UX | Diretrizes → voz/ativos coerentes | Não usar para lógica do produto | ACTIVE |
| browser-harness | BROWSER_QA | URL/fluxo → controle e evidência browser | Trigger local amplo; aplicar seleção mínima do router | ACTIVE_WITH_LIMITATIONS |
| browser-testing-with-devtools | BROWSER_QA | Página → DOM/estilos/rede/performance | Chrome DevTools MCP não configurado nesta sessão | ACTIVE_WITH_LIMITATIONS |
| cavecrew | ORCHESTRATION | Missão → avaliar delegação | Perfis `cavecrew-*` citados em `.agents/agents/` ausentes; só usar se a ferramenta de subagentes estiver disponível e os papéis forem descritos explicitamente | ACTIVE_WITH_LIMITATIONS |
| caveman | OTHER | Pedido → estilo conciso | Não substituir relatório de alto risco | ACTIVE |
| caveman-commit | GIT_WORKTREE | Diff → sugestão de mensagem | Não autoriza staging/commit | ACTIVE |
| caveman-compress | DOCUMENTATION | Texto longo → resumo fiel | Sobrescreve o alvo e cria `.original.md`; requer alvo explicitamente autorizado e backup verificado; não aplicar a dados desconhecidos | ACTIVE_WITH_LIMITATIONS |
| caveman-help | OTHER | Dúvida de modo → referência rápida | Consulta, não altera estado | ACTIVE |
| caveman-review | CODE_REVIEW | Diff → achados concisos | Não substitui testes ou review independente | ACTIVE |
| caveman-stats | OTHER | Contexto → métricas de tokens | Hooks requeridos `caveman-stats.js` e `caveman-mode-tracker.js` ausentes | DISABLED_FOR_ROUTING |
| deep-research | OTHER | Questão ampla → síntese com fontes | Verificar ferramenta/custo; sem custo recorrente por padrão | ACTIVE |
| deploy-to-vercel | RELEASE_READINESS | Pedido de deploy → fluxo Vercel | Somente autorização explícita de deploy; fallback de publicação sem autenticação/claim URL não é elegível neste projeto | ACTIVE_WITH_LIMITATIONS |
| design | VISUAL_UX | Brief criativo → artefato visual | Especializado; fora do fluxo normal | ACTIVE |
| design-system | VISUAL_UX | Tokens/componentes → especificação | Acionar quando sistema visual mudar | ACTIVE |
| doubt-driven-development | DATA_INTEGRITY | Contrato de alto risco → revisão adversarial | Processo; não autoriza mudança protegida | ACTIVE |
| fact-checker | DATA_INTEGRITY | Afirmação → confiança e fontes cruzadas | Busca verificável | ACTIVE |
| find-skills | ORCHESTRATION | Capacidade ausente → opções de Skill | Não instalar automaticamente | ACTIVE |
| firebase-security-rules-auditor | SECURITY | Regras Firebase → achados | Não editar/publicar regras | ACTIVE |
| frontend-design | VISUAL_UX | Nova direção estética → composição | Track exclusiva | ACTIVE |
| impeccable | VISUAL_UX | UI existente → polish/a11y/spacing | Acabamento, não redesign | ACTIVE |
| interface-design | VISUAL_UX | Requisito de tela → interface de produto | Preservar Visual Canon | ACTIVE |
| interview-me | ORCHESTRATION | Pedido ambíguo → requisitos | Pontual; não usar em CI/loop | ACTIVE |
| mantis-architecture | ARCHITECTURE | Contexto → análise arquitetural | Exemplo de entidade é output | ACTIVE |
| mantis-critic | CODE_REVIEW | Proposta/relatório → crítica | Patch/reproduce desabilitados por padrão | ACTIVE |
| mantis-report | DOCUMENTATION | Achados → relatório | Sem patch/commit | ACTIVE |
| mantis-review | CODE_REVIEW | Artefato → revisão | Revisão apenas por padrão | ACTIVE |
| mantis-structural-index | ARCHITECTURE | Árvore/código → índice | Blueprint auxiliar referenciado ausente | ACTIVE_WITH_LIMITATIONS |
| mantis-threat-model | SECURITY | Arquitetura → modelo de ameaças | Referência à entidade é output gerado | ACTIVE |
| planning-with-files | ORCHESTRATION | Missão longa → plano local | Hooks desligados; usar convenção .qa-state | ACTIVE |
| playwright | BROWSER_QA | URL/jornada → teste/screenshot | CLI/wrapper deve estar disponível | ACTIVE |
| slides | VISUAL_UX | Narrativa → apresentação HTML | Especializado | ACTIVE |
| source-driven-development | DATA_INTEGRITY | Questão técnica → decisão com fonte oficial | Não substituir regra interna silenciosamente | ACTIVE |
| source-tracker | DOCUMENTATION | URLs/notas → bibliografia local | Manual; sem cron/segredos | ACTIVE |
| ui-styling | VISUAL_UX | Requisito → shadcn/Radix/Tailwind | Stack específica; não presumir compatibilidade | ACTIVE_WITH_LIMITATIONS |
| ui-ux-pro-max | VISUAL_UX | Brief → pesquisa de padrões de design | Sob demanda; não substitui track visual | ACTIVE |
| web-quality-audit | TESTING | URLs/estados → achados medidos | Seis links opcionais a Skills irmãs ausentes | ACTIVE_WITH_LIMITATIONS |

Taxonomia usa uma categoria primária por Skill. Roteamento de agente/modelo
continua separado da seleção de Skills.

## Saúde estrutural e sobreposições

- `caveman-stats` não pode executar a função anunciada neste snapshot: o
  `SKILL.md`/README dependem de dois hooks ausentes do pacote. Está
  `DISABLED_FOR_ROUTING`; não simular ou estimar métricas. Reavaliar apenas
  após localizar e validar ambos os hooks no ambiente real.
- `cavecrew` referencia três perfis ausentes (`.agents/agents/cavecrew-*.md`)
  e README de nível `.agents` ausente. A ferramenta de subagentes existe no
  runtime Codex, mas os perfis/formatos de saída declarados não foram validados;
  usar somente com papéis explicitamente definidos e sem depender desses arquivos.
- `banner-design` contém a referência principal de tamanhos/estilos, mas cita
  `docs/brand-guidelines.md`, `ai-artist`, `ai-multimodal`,
  `chrome-devtools` e `inject-brand-context.cjs`, não encontrados neste pacote.
  A referência local de tamanhos existe; fluxo de geração/exportação ponta a
  ponta não está operacional. Não alegar uso dessas dependências.
- `caveman-compress` descreve sobrescrita do arquivo-alvo após criar
  `<arquivo>.original.md`. É um efeito explícito da Skill, não autorização:
  aplicar somente ao alvo solicitado, confirmar backup e preservar arquivos
  existentes/ambíguos.
- `deploy-to-vercel` inclui um fallback de deploy sem autenticação que retorna
  URL de claim. Ele conflita com o limite do projeto para publicação externa;
  não usar esse fallback. O roteamento local exige autorização explícita e
  fluxo oficial autenticado.
- Auditoria de links Markdown nos pacotes operacionais encontrou 16 destinos
  locais ausentes: 10 referências de capacidade (seis links de web-quality-audit
  a Skills irmãs, três perfis de cavecrew e um blueprint de
  mantis-structural-index) e seis links de README para `.agents/README.md`.
  Há também referências a entidades/URLs que são exemplos ou artefatos de
  saída, não dependências de entrada. Não inventar os arquivos faltantes; usar
  fallback descrito nos próprios fluxos e manter limitações explícitas.
- archify-main e browser-harness-main são cópias upstream; os SKILL.md raiz
  de archify/browser-harness têm hashes iguais às cópias raiz correspondentes.
  impeccable.bak é backup antigo distinto. Nada foi apagado.
- browser-harness tem trigger local “sempre”; o router permite omiti-lo quando
  Playwright/DevTools bastarem. Precedência: identidade/segurança → Superpowers
  → seleção mínima do router → instrução especializada. Não carregar redundante.
- Varredura das 43 instruções: zero referência ao projeto proibido, zero
  comando Git destrutivo como default e nenhum caminho de branch/worktree
  obsoleto. Há efeitos de escrita documentados em Skills específicas
  (`caveman-compress`, Mantis e deploy); os limites acima impedem que a
  instrução local seja confundida com autorização do projeto. A varredura cobre
  os arquivos de instrução, não dependências transitivas.
- Uso histórico por missão não é estruturado o bastante para medir frequência
  ou afirmar “nunca usado”. Registros citam UI, browser QA, review e Skills de
  fonte/integridade; ausência de menção não significa obsolescência.
- Lacunas: Skill dedicada a lifecycle Git/worktree, intake/sanitização de
  fixtures financeiras e validação automatizada da biblioteca. Não recomendo
  criar Skills novas nesta auditoria; governança existente cobre parte do ciclo.

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
| Delegação de subagentes | `cavecrew` (condicional) | avaliar papéis se suporte existir | perfis locais ausentes; descrever papéis explicitamente; não delegar decisão financeira final |
| Review final | `caveman-review` | escopo, risco e simplicidade do diff | não substitui testes |
| Mensagem de commit | `caveman-commit` | mensagem curta e precisa | commit continua gate separado |
| Contexto longo | `caveman-compress` (condicional) | compactar arquivo explicitamente autorizado | sobrescreve o alvo após backup; verificar backup e nunca tocar dado desconhecido |
| Medir tokens | Nenhuma Skill local elegível | `caveman-stats` desativada; não inventar métricas | indisponível até validar ambos os hooks |
| Ajuda sobre modos | `caveman-help` | referência rápida | não altera governança |
| Marca, banner ou apresentação | `brand`, `banner-design`, `slides`, `design` | materiais de comunicação | baixo uso; não são produto normal |
| Deploy | `deploy-to-vercel` | fluxo oficial autenticado, somente quando autorizado | não usar deploy sem autenticação/claim URL; sem deploy automático |

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

## Dry-runs de roteamento — 2026-09-25

Em todos os cenários: identidade/segurança → Superpowers → classificação →
descoberta física → seleção mínima elegível. Roteamento de agente/modelo é
decidido separadamente e não altera a seleção técnica de Skills.

| Cenário | Classificação | Skills especializadas elegíveis após Superpowers | Exclusão/limite verificado |
|---|---|---|---|
| Git/worktree audit | GIT_WORKTREE | `caveman-review` se revisão do diff/doc ajudar | Não selecionar fluxo destrutivo; cada operação segue gates Git |
| Bug debugging | DEBUGGING | `superpowers:systematic-debugging` se disponível + Skill de domínio mínima | Superpowers não autoriza mutação protegida; não selecionar pacote ausente |
| Visual/mobile | UI_UX / RESPONSIVE | uma trilha entre `interface-design`, `frontend-design` ou `impeccable`; `playwright` para prova | `banner-design` não é trilha de produto; pedido de banner usa só referências existentes |
| Financial data | FINANCIAL_LOGIC | `doubt-driven-development` + `source-driven-development` se fonte externa importar | Preservar autoridade manual/proveniência; UNKNOWN não vira zero |
| Import Center | IMPORT / DATA_INTEGRITY | `doubt-driven-development`; `playwright` somente se UI/E2E mudar | Não selecionar `caveman-stats`; suporte de broker requer fixtures reais |
| Release certification | RELEASE_READINESS | `verification-before-completion`; `deploy-to-vercel` apenas com pedido explícito | Sem merge/deploy automático; `caveman-stats` excluída |

Resultado esperado nos seis dry-runs: Superpowers primeiro, menor conjunto
útil, nenhuma Skill `BROKEN`/`DISABLED_FOR_ROUTING`, limitações avaliadas
antes da seleção e agente/modelo roteado fora do catálogo técnico de Skills.

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
