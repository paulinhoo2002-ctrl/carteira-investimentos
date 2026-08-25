# Skills locais do projeto

## SKILL SELECTION PROTOCOL

1. Entenda o problema antes de escolher ferramentas.
2. Consulte este catalogo e confirme o `SKILL.md` fisico.
3. Selecione somente Skills realmente uteis.
4. Combine Skills quando houver beneficio real, sem uso mecanico de todas.
5. Registre uma Skill nova relevante quando ela for descoberta e validada.

## Mapa operacional

Esta lista descreve as Skills fisicamente presentes em `.agents/skills`.
Selecione pelo problema e combine somente as que agregarem valor.

### DESIGN / UX

- `interface-design`: hierarquia, fluxos, layout e responsividade. Usar em mudancas de interface; nao usar para dominio financeiro.
- `frontend-design`: direcao visual e implementacao de telas. Usar para novas composicoes ou refinamentos.
- `design-system`: tokens, componentes e consistencia de sistema. Usar quando a mudanca atravessar varias telas.
- `impeccable`: polish, contraste, spacing, acessibilidade e revisao visual.
- `ui-ux-pro-max`: pesquisa operacional de padroes, tipografia, paleta e dashboards.
- `ui-styling`: orientacao de componentes UI quando a stack aplicavel exigir.

### BROWSER / VALIDACAO VISUAL

- `playwright`: prova automatizada em navegador real, viewports, interacoes e runtime.
- `browser-harness`: CDP, screenshots, DOM, overflow e telemetria de navegador. Usar quando disponivel; e ferramenta de QA.
- `browser-testing-with-devtools`: diagnostico de DOM, estilos, console, rede e eventos; complementar com Playwright para prova.

### REVIEW / ENGINEERING

- `caveman-review`: revisao final de escopo, simplicidade e riscos.
- `doubt-driven-development`: revisao adversarial obrigatoria em decisoes financeiras, persistencia, datas e dados.
- `source-driven-development`: decisoes baseadas em documentacao primaria/oficial.
- `cavecrew`: decidir quando delegacao separada ajuda; nao e obrigatorio.

### OUTRAS

- `archify`: diagramas e documentacao arquitetural.
- `interview-me`: esclarecer pedidos realmente ambiguos; nao executar automaticamente em loops.
- `caveman`, `caveman-commit`, `caveman-compress`, `caveman-help` e `caveman-stats`: comunicacao, fechamento e manutencao de contexto.

### Status e auditoria fisica

Skills relevantes foram encontradas em `.agents/skills/`. Ha variantes/artefatos
que nao devem ser tratados como fontes canonicas sem auditoria: `impeccable.bak`,
`browser-harness-main` e seus subdiretorios internos. A fonte operacional local
principal e o `SKILL.md` diretamente dentro de cada pasta da Skill.

### Politica de selecao

O agente deve escolher Skills pelo problema, nao carregar todas mecanicamente.
Para UI, considerar `interface-design` + `frontend-design` + `impeccable`;
para browser, `playwright` e/ou `browser-harness`; para revisao,
`caveman-review`; para dominio financeiro, `doubt-driven-development` e
`source-driven-development`. A lista nao concede permissao para alterar areas
protegidas.

### Evidencia da Fase 12

As Skills efetivamente utilizadas na Fase 12 foram:
`frontend-design`, `interface-design`, `impeccable`, `playwright`,
`browser-harness` e `caveman-review`.

## FULL EXECUTION AUTONOMY

Codex, OpenCode and Hermes may use the applicable local skills to complete an
authorized phase end to end: analysis, implementation, tests, browser
validation, screenshots, visual review, correction and revalidation. Consult
`docs/ai/AGENT_AUTONOMY.md` for scope and protected-area limits.

Browser Harness and Playwright are approved for real browser validation,
responsive checks, runtime inspection and screenshots.

### `ui-ux-pro-max`
- Uso: inteligencia de design, padroes de UI/UX, design systems, dashboards, charts, tipografia, paletas e heuristicas responsivas.
- Quando usar: ao revisar ou planejar UI, UX, dashboards, visualizacoes, componentes, acessibilidade e responsividade.
- Quando nao usar: regras financeiras, persistencia, schema, backend ou automacao sem impacto visual.
- Papel: complementar `frontend-design`, `interface-design`, `impeccable`, `playwright` e `caveman-review`; nao substitui nenhuma delas.
- Instalacao oficial: `npm install -g ui-ux-pro-max-cli` e `uipro init --ai codex` ou `uipro init --ai opencode`.
- Integracoes oficiais: Codex em `.agents/skills/`; OpenCode em `.opencode/skills/`.
- O CLI tambem gera skills auxiliares oficiais (`banner-design`, `brand`, `design`, `design-system`, `slides` e `ui-styling`); nao duplicar manualmente.
- Versao validada nesta infraestrutura: CLI `2.14.1`, skill/release `v2.14.1`.
- Limites obrigatorios: nao alterar formulas, saldo, patrimonio, preco medio, resultado, rentabilidade, proventos, IR, IOF, RF, schema, `FinanceCore`, `PersistenceCore` ou persistencia.
- Pode atuar somente em UI, UX, layout, design system, charts visuais, hierarquia, tipografia, responsividade, acessibilidade e copy visual.

Antes de iniciar tarefas, verificar se alguma skill local se aplica.
Quando varias skills forem relevantes, combina-las na ordem mais adequada ao trabalho.

## UI/UX

### `interface-design`
- Uso: UI/UX, layouts, hierarquia visual, espaçamento, responsividade e consistencia de design.
- Quando usar: ao criar ou revisar telas, fluxos visuais, componentes e refinamento de interfaces.
- Quando nao usar: backend, persistencia, automacao nao visual ou ajustes que nao mudam a experiencia da interface.
- Combinacao recomendada: `playwright` para validar no navegador, `impeccable` para polish final, `caveman-review` para revisar o resultado.
- Caminho local: `.agents/skills/interface-design/`
- Observacao: esta skill ja existia no projeto antes da restauracao e diverge da biblioteca local em alguns arquivos auxiliares; ela foi preservada sem sobrescrita.

### `impeccable`
- Uso: polish visual, consistencia, clareza e revisao final da interface.
- Quando usar: ao refinar uma UI ja montada e validar qualidade visual, composicao, acessibilidade e consistencia.
- Quando nao usar: backend-only, persistencia ou tarefas sem interface.
- Combinacao recomendada: `interface-design` antes da implementacao, `playwright` para validar, `caveman-review` para fechar.
- Caminho local: `.agents/skills/impeccable/`

## Navegador / testes visuais

### `playwright`
- Uso: validacao real em navegador, desktop/mobile, console, `pageerror` e `requestfailed`.
- Quando usar: ao confirmar fluxos completos, regressoes visuais e comportamento interativo.
- Quando nao usar: tarefas puramente documentais ou de texto sem fluxo de navegador.
- Combinacao recomendada: `interface-design` para a direcao visual, `impeccable` para o polimento final.
- Caminho local: `.agents/skills/playwright/`

## Workflow

### `caveman`
- Uso: workflow tecnico, review, commit, stats e subtarefas relacionadas.
- Quando usar: quando a tarefa pedir comunicacao ultra-condensada, revisao, fechamento tecnico, mensagens de commit ou apoio a subtarefas.
- Quando nao usar: tarefas de interface que dependam de explicacao detalhada ou comunicacao normal.
- Combinacao recomendada: `caveman-review` para revisar diff, `caveman-commit` para mensagem, `caveman-stats` para uso de token.
- Caminho local: `.agents/skills/caveman/`

### `caveman-review`
- Uso: review de diff, comentario acionavel e fecho tecnico.
- Quando usar: revisao final de PR, verificacao de regressao, apontamento de risco.
- Quando nao usar: implementacao de feature ou analise visual detalhada.
- Combinacao recomendada: `caveman` ou `impeccable`, conforme o tipo de tarefa.
- Caminho local: `.agents/skills/caveman-review/`

### `caveman-commit`
- Uso: gerar mensagem de commit curta, clara e consistente.
- Quando usar: fechamento de tarefa com commit local.
- Quando nao usar: tarefas sem commit ou com mensagem ja definida.
- Combinacao recomendada: `caveman-review` antes do commit.
- Caminho local: `.agents/skills/caveman-commit/`

### `caveman-compress`
- Uso: comprimir memoria, notas e arquivos de orientacao longos sem perder conteudo tecnico.
- Quando usar: sessao longa, handoff ou resumo de contexto.
- Quando nao usar: tarefas curtas ou quando o texto precisar permanecer detalhado.
- Combinacao recomendada: `caveman-help` para consulta rapida, `caveman-stats` para analise de uso.
- Caminho local: `.agents/skills/caveman-compress/`

### `caveman-help`
- Uso: referencia rapida dos modos e comandos do ecossistema caveman.
- Quando usar: quando for preciso lembrar variações, comandos ou formas de uso.
- Quando nao usar: implementacao ou review direto.
- Combinacao recomendada: `caveman` para executar e `caveman-stats` para medir.
- Caminho local: `.agents/skills/caveman-help/`

### `caveman-stats`
- Uso: mostrar uso real de token e estimativas de economia.
- Quando usar: quando for necessario medir custo de contexto ou comparar modos.
- Quando nao usar: tarefas de implementacao ou review que nao precisem de medicao.
- Combinacao recomendada: `caveman-compress` para reduzir contexto e `caveman-help` para referencia.
- Caminho local: `.agents/skills/caveman-stats/`

## Outras skills instaladas

### `cavecrew`
- Uso: decidir quando delegar para subagentes estilo caveman.
- Quando usar: tarefas separaveis em pesquisa, edicao curta ou revisao delegada.
- Quando nao usar: tarefas pequenas que ja cabem bem em um unico fluxo.
- Combinacao recomendada: `caveman` para comunicacao compacta e `caveman-review` para fechamento.
- Caminho local: `.agents/skills/cavecrew/`

### `archify`
- Uso: diagramas de arquitetura, workflow, sequencia, data-flow e lifecycle em HTML validado.
- Quando usar: quando a tarefa pedir visualizacao estrutural, fluxos ou diagramas exploraveis.
- Quando nao usar: UI comum, backend puro ou tarefas que nao precisam de diagrama.
- Combinacao recomendada: `impeccable` para polish visual e `playwright` se a saida virar interface navegavel.
- Caminho local: `.agents/skills/archify/`

## Skills de governança (upstream `addyosmani/agent-skills` @ 0.6.6)

Adicionadas em 2026-08-12, pinadas ao tag `0.6.6` (commit `bdf76c7c6b7b3b3e01bb15c9fdc42ac5351855c1`, licenca MIT).
Destino: `.agents/skills/<skill>/`; referencia compartilhada preservada em `.agents/skills/references/orchestration-patterns.md` (necessaria por `doubt-driven-development`).

### `interview-me`
- Uso: extrair a intencao real por tras de requisitos ambíguos, uma pergunta por vez, ate ~95% de confianca.
- Quando usar: pedido subespecificado ou ambíguo (ex.: "melhorar rentabilidade", "melhorar renda fixa", "criar projecao", "calcular rendimento", "melhorar preco medio") ou quando o usuario invocar explicitamente ("interview me").
- Quando nao usar: typo, copy, CSS, troca de label, correcao mecanica ou pedido ja explicitamente especificado.
- CONDICIONAL: nunca executar automaticamente em CI/loop autonomo.
- Caminho local: `.agents/skills/interview-me/`

### `source-driven-development`
- Uso: fundamentar decisoes de implementacao em documentacao oficial atual (APIs, bibliotecas, Vercel, Firebase, B3, CVM, Banco Central, CDI, Selic, IPCA, formatos externos, tributacao quando aplicavel).
- Regra da Carteira: FONTES FINANCEIRAS = fonte primaria/oficial; a fonte externa define o contrato; nao substituir silenciosamente valores internos da carteira por informacao externa.
- Se a documentacao externa conflitar com o comportamento existente: PARAR e reportar o conflito.
- Caminho local: `.agents/skills/source-driven-development/`

### `doubt-driven-development`
- Uso: revisao adversaria em contexto fresco antes de consolidar decisoes nao triviais.
- OBRIGATORIA antes de consolidar mudancas em: patrimonio, rentabilidade, preco medio, dividendos, proventos, renda fixa, imposto, aportes, importacao, migracao, backup, persistencia, datas financeiras, arredondamentos, bruto/liquido.
- Checklist: dupla contagem? zero versus ausencia? bruto versus liquido? aporte versus rendimento? provento contado duas vezes? resgate tratado como perda? mes/ano boundary? NaN/Infinity? arredondamento? migracao altera historico? backup roundtrip preserva patrimonio?
- Complementa testes; nao substitui testes.
- Referencia compartilhada: `.agents/skills/references/orchestration-patterns.md`.
- Caminho local: `.agents/skills/doubt-driven-development/`

### `browser-testing-with-devtools`
- Uso: investigacao/runtime no navegador (DOM, console, network, computed styles, event handlers, focus, accessibility tree, performance, runtime errors, request failures).
- Regra: DevTools diagnostica e entende; Playwright transforma comportamento em prova automatizada. NAO substitui Playwright.
- Dependencia opcional/pending: Chrome DevTools MCP nao configurado neste ambiente (sem `.mcp.json`); etapa propria futura.
- Caminho local: `.agents/skills/browser-testing-with-devtools/`

### `browser-harness`
- Uso: automacao e validacao real de navegador via CDP, incluindo DOM, runtime, responsividade, screenshots, overflow e regressao visual.
- Quando usar: interacao real com a aplicacao, navegacao, inspecao de console/page errors, screenshots e fluxos browser.
- Quando nao usar: regras financeiras, persistencia, schema ou tarefas sem interacao de navegador.
- Origem oficial: `browser-use/browser-harness` (`https://github.com/browser-use/browser-harness`).
- Instalacao validada: `browser-harness 0.1.9` via `uv tool install --python 3.12 --upgrade --force browser-harness`.
- Caminho da skill: `.agents/skills/browser-harness/`.
- Conexao: usar o navegador local via CDP; em falha, executar `browser-harness --doctor` e seguir `install.md` oficial.
- Limite: ferramenta auxiliar de QA; nao autoriza alterar logica financeira, persistencia, schema ou arquivos protegidos.

Regras transversais das quatro skills:

- Nenhuma das quatro skills recebe autoridade sobre areas protegidas.
- `interview-me` e condicional; `source-driven-development` exige fontes primarias; `doubt-driven-development` e obrigatoria no dominio financeiro sensivel; `browser-testing-with-devtools` complementa Playwright.

## Regra de selecao

- Verificar primeiro se alguma skill local se aplica antes de iniciar uma tarefa.
- Quando varias skills forem relevantes, combina-las.

## Fluxos padrao

### `frontend-design`

- Uso: planejamento e revisao de UI com identidade visual, tipografia, composicao, espacos, estados e responsividade.
- Quando usar: telas, modais, fluxos visuais ou refinamentos de usabilidade com impacto de interface.
- Quando nao usar: regras financeiras, persistencia, backend ou tarefas sem impacto visual.
- Combinacao recomendada: `interface-design`, `playwright`, `impeccable` e `caveman-review`.
- Responsabilidade: composicao visual, frontend, responsividade, componentes e acabamento.
- Caminho local: `.agents/skills/frontend-design/`

### Responsabilidades da stack UI/UX

- `interface-design`: fluxo, arquitetura da interface, hierarquia, estados e interacao.
- `playwright`: validacao funcional e responsiva em navegador real.
- `impeccable`: spacing, tipografia, contraste, acessibilidade e acabamento.
- `caveman-review`: escopo, simplicidade, reversibilidade e seguranca do diff.

### UI
`frontend-design` → `interface-design` → implementacao → `playwright` → `impeccable` → `caveman-review`

### Mudanca tecnica
auditoria → implementacao → testes → `caveman-review` → `caveman-commit`

### Sessao longa/confusa
`caveman-compress` → novo chat/handoff
