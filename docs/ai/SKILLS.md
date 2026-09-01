# Skills locais do projeto

## SKILL SELECTION PROTOCOL

1. Entenda o problema antes de escolher ferramentas.
2. Consulte este catálogo e confirme o `SKILL.md` físico.
3. Selecione somente Skills realmente úteis (ver `docs/ai/SKILL_ROUTER.md`).
4. Combine Skills quando houver benefício real, sem uso mecânico de todas.
5. Registre uma Skill nova relevante quando ela for descoberta e validada.

---

## INVENTÁRIO FÍSICO REAL — RECONCILIADO

**Total: 28 pastas em `.agents/skills/` contendo SKILL.md**

| # | PASTA | TIPO | STATUS | OBSERVAÇÃO |
|---|-------|------|--------|------------|
| 1 | `archify` | REAL_SKILL | Ativo | Diagramas arquiteturais validados |
| 2 | `archify-main` | UPSTREAM_COPY | Backup/Referência | Cópia upstream `archify-main/archify-main/archify` — não usar como fonte canônica |
| 3 | `banner-design` | REAL_SKILL | Baixo uso | Marketing/assets — não usar em tarefas normais do produto |
| 4 | `brand` | REAL_SKILL | Baixo uso | Identidade/marca — apenas quando necessário |
| 5 | `browser-harness` | REAL_SKILL | Ativo | CDP automation, QA browser |
| 6 | `browser-harness-main` | UPSTREAM_COPY | Backup/Referência | Fonte upstream completa — não usar como skill operacional |
| 7 | `browser-testing-with-devtools` | REAL_SKILL | Ativo | DevTools MCP, diagnóstico runtime |
| 8 | `cavecrew` | REAL_SKILL | Baixo uso | Delegação subagentes caveman |
| 9 | `caveman` | REAL_SKILL | Ativo | Comunicação ultra-condensada |
| 10 | `caveman-commit` | REAL_SKILL | Ativo | Commit messages |
| 11 | `caveman-compress` | REAL_SKILL | Ativo | Compactar documentação/memória |
| 12 | `caveman-help` | REAL_SKILL | Ativo | Referência rápida |
| 13 | `caveman-review` | REAL_SKILL | Ativo | Review de diff |
| 14 | `caveman-stats` | REAL_SKILL | Ativo | Medir tokens |
| 15 | `design` | REAL_SKILL | Baixo uso | Brand, tokens, UI, logo, CIP, slides, banners, ícones |
| 16 | `design-system` | REAL_SKILL | Ativo | Tokens, componentes, slides |
| 17 | `doubt-driven-development` | REAL_SKILL | **OBRIGATÓRIA** finance/persist | Revisão adversarial contexto fresco |
| 18 | `frontend-design` | REAL_SKILL | **TRACK: Nova direção** | Direção visual, composição, identidade |
| 19 | `impeccable` | REAL_SKILL | **TRACK: Polish final** | Polish, contraste, spacing, a11y |
| 20 | `impeccable.bak` | BACKUP | Ignorar | Backup antigo — não usar |
| 21 | `interface-design` | REAL_SKILL | **TRACK: Product UI** | Hierarquia, fluxos, layout, responsividade |
| 22 | `interview-me` | REAL_SKILL | Condicional | Esclarecer pedidos ambíguos |
| 23 | `playwright` | REAL_SKILL | Ativo | Validação real navegador, viewports |
| 24 | `references` | REFERENCE_FOLDER | Auxiliar | Pasta compartilhada (orchestration-patterns.md) |
| 25 | `slides` | REAL_SKILL | Baixo uso | Apresentações HTML — não usar em tarefas normais |
| 26 | `source-driven-development` | REAL_SKILL | Ativo | Decisões baseadas em doc oficial |
| 27 | `ui-styling` | REAL_SKILL | Condicional | shadcn/ui + Tailwind |
| 28 | `ui-ux-pro-max` | REAL_SKILL | **SOB DEMANDA** | Design system amplo, pesquisa estruturada |

**REAL_SKILL_COUNT = 24** (excluindo: archify-main, browser-harness-main, impeccable.bak, references)

---

## CLASSIFICAÇÃO OPERACIONAL

### CORE (sempre disponíveis, carregar conforme SKILL_ROUTER)
```
interface-design, frontend-design, impeccable, playwright, browser-testing-with-devtools,
source-driven-development, doubt-driven-development, design-system, caveman, caveman-review,
caveman-commit, caveman-compress, archify
```

### ON_DEMAND (carregar apenas quando critério explícito for atendido)
```
ui-ux-pro-max, ui-styling, brand, banner-design, slides, cavecrew, interview-me
```

### LOW_USE (raramente necessários no produto)
```
archify, banner-design, slides, brand, cavecrew
```

### BACKUP/REFERENCE (não carregar como skill operacional)
```
archify-main, browser-harness-main, impeccable.bak, references
```

### DUPLICATE/UPSTREAM (cópias upstream preservadas para referência)
```
archify-main → upstream archify
browser-harness-main → upstream browser-harness
impeccable.bak → backup impeccable
```

---

## MAPA OPERACIONAL RESUMIDO (ver SKILL_ROUTER.md para detalhes)

### DESIGN / UX — TRACKS MUTUAMENTE EXCLUSIVOS
- `interface-design`: **Padrão** para implementação product UI (Dashboard, Ativos, Dividendos, RF, Rentabilidade, Aportes, Metas, Relatórios)
- `frontend-design`: Nova direção visual/linguagem do zero
- `impeccable`: Polish final (contraste, spacing, a11y, tipografia) — não redesenha

### BROWSER / VALIDAÇÃO VISUAL
- `playwright`: Prova automatizada, viewports, interações, runtime
- `browser-testing-with-devtools`: Diagnóstico DOM, estilos, console, rede, eventos

### REVIEW / ENGENHARIA
- `caveman-review`: Review final de escopo, simplicidade, riscos
- `doubt-driven-development`: **Obrigatória** em decisões financeiras, persistência, dados
- `source-driven-development`: Decisões baseadas em documentação primária/oficial

### OUTRAS
- `archify`: Diagramas quando realmente ajudar
- `design-system`: Tokens/componentes quando houver alteração real no sistema
- `ui-styling`: Apenas se stack shadcn/ui + Tailwind
- `ui-ux-pro-max`: Apenas design system amplo / pesquisa estruturada
- `interview-me`: Apenas pedidos subespecificados

---

## POLÍTICA DE SELEÇÃO (ver SKILL_ROUTER.md)

- Verificar primeiro se alguma skill local se aplica antes de iniciar uma tarefa.
- Quando várias skills forem relevantes, combinar na ordem mais adequada ao trabalho.
- **Máximo 2 skills normalmente, 3 excepcionalmente** (ver `MAX_SKILLS_NORMAL` / `MAX_SKILLS_EXCEPTIONAL`).
- `ui-ux-pro-max` não substitui `interface-design`, `frontend-design`, `impeccable`, `playwright`, `caveman-review`.
- Nenhuma skill autoriza alterar áreas protegidas (finance-core, persistence-core, schema, etc.).

---

## EVIDÊNCIA DE USO RECENTE

Skills efetivamente utilizadas nas iterações do Visual North Star (Fase 12+):
`frontend-design`, `interface-design`, `impeccable`, `playwright`, `browser-harness`, `caveman-review`, `source-driven-development`, `doubt-driven-development`.

---

## FULL EXECUTION AUTONOMY

Codex, OpenCode and Hermes may use the applicable local skills to complete an
authorized phase end to end: analysis, implementation, tests, browser
validation, screenshots, visual review, correction and revalidation. Consult
`docs/ai/AGENT_AUTONOMY.md` for scope and protected-area limits.

Browser Harness and Playwright are approved for real browser validation,
responsive checks, runtime inspection and screenshots.

---

## LIMITE OBRIGATÓRIO: ui-ux-pro-max

- Uso: inteligência de design, padrões de UI/UX, design systems, dashboards, charts, tipografia, paletas e heurísticas responsivas.
- Quando usar: ao revisar ou planejar UI, UX, dashboards, visualizações, componentes, acessibilidade e responsividade.
- Quando não usar: regras financeiras, persistência, schema, backend ou automação sem impacto visual.
- Papel: complementar `frontend-design`, `interface-design`, `impeccable`, `playwright` e `caveman-review`; **não substitui nenhuma delas**.
- Instalação oficial: `npm install -g ui-ux-pro-max-cli` e `uipro init --ai codex` ou `uipro init --ai opencode`.
- Integrações oficiais: Codex em `.agents/skills/`; OpenCode em `.opencode/skills/`.
- O CLI também gera skills auxiliares oficiais (`banner-design`, `brand`, `design`, `design-system`, `slides` e `ui-styling`); **não duplicar manualmente**.
- Versão validada nesta infraestrutura: CLI `2.14.1`, skill/release `v2.14.1`.
- Limites obrigatórios: não alterar fórmulas, saldo, patrimônio, preço médio, resultado, rentabilidade, proventos, IR, IOF, RF, schema, `FinanceCore`, `PersistenceCore` ou persistência.
- Pode atuar somente em UI, UX, layout, design system, charts visuais, hierarquia, tipografia, responsividade, acessibilidade e copy visual.

---

## REGRAS TRANSVERSAIS DAS SKILLS DE GOVERNANÇA (upstream `addyosmani/agent-skills` @ 0.6.6)

- `interview-me` é condicional: usado somente sob ambiguidade material; nunca em CI/loop autônomo.
- `source-driven-development` exige fonte primária/oficial; nunca substituir silenciosamente valores internos da carteira por informação externa; conflito com comportamento existente = PARAR e reportar.
- `doubt-driven-development` é **obrigatória** antes de consolidar mudanças no domínio financeiro sensível; complementa testes, não os substitui.
- `browser-testing-with-devtools` diagnostica/entende runtime; Playwright transforma em prova automatizada; **não substitui Playwright**.
- Nenhuma das quatro skills recebe autoridade sobre áreas protegidas.
- Dependência opcional/pending: Chrome DevTools MCP (necessário por `browser-testing-with-devtools`) não está configurado; requer etapa própria.