> Inventário operacional histórico abaixo preservado como snapshot de 2026-10-10. O inventário físico mais recente, seus 38 IDs únicos, hashes independentes e candidatos excluídos estão em [`SKILLS_INDEX.md`](SKILLS_INDEX.md) e [`skills-catalog.json`](skills-catalog.json); valide drift com `npm run verify:skills`.

# Skills locais do projeto

## SKILL SELECTION PROTOCOL

1. Em missão substancial, siga `AGENTS.md` e carregue/use Superpowers
   primeiro, quando disponível.
2. Descubra o inventário físico e confirme o `SKILL.md` da Skill selecionada.
3. Classifique a tarefa e consulte `docs/SKILLS_ROUTING.md` e
   `docs/ai/SKILL_ROUTER.md`.
4. Selecione somente Skills especializadas realmente úteis, sem uso mecânico.
5. Registre disponibilidade, uso, lacunas e eventual reavaliação; registre uma
   Skill nova relevante apenas quando descoberta e validada.

---

## INVENTÁRIO FÍSICO REAL — RECONCILIADO

**Inventário observado em 2026-10-10:** nesta máquina, o diretório local tinha
43 pastas de primeiro nível, 41 `SKILL.md` diretos e 44 recursivos. O clone
limpo baseado em `origin/main` contém 17 Skills versionadas; as demais
instalações/cópias locais não são portáveis nem presumidas em outras worktrees.
O catálogo físico abaixo lista as pastas vistas neste host, não garante
disponibilidade no runtime de uma missão futura.

| # | PASTA | TIPO | STATUS | OBSERVAÇÃO |
|---|-------|------|--------|------------|
| 1 | `archify` | REAL_SKILL | Ativo | Diagramas arquiteturais validados |
| 2 | `archify-main` | UPSTREAM_COPY | Backup/Referência | Cópia upstream `archify-main/archify-main/archify` — não usar como fonte canônica |
| 3 | `banner-design` | REAL_SKILL | Limitações | Referência de tamanhos presente; geradores `ai-artist`/`ai-multimodal`, helper de marca e exportador `chrome-devtools` ausentes |
| 4 | `brand` | REAL_SKILL | Baixo uso | Identidade/marca — apenas quando necessário |
| 5 | `browser-harness` | REAL_SKILL | Ativo | CDP automation, QA browser |
| 6 | `browser-harness-main` | UPSTREAM_COPY | Backup/Referência | Fonte upstream completa — não usar como skill operacional |
| 7 | `browser-testing-with-devtools` | REAL_SKILL | Ativo | DevTools MCP, diagnóstico runtime |
| 8 | `cavecrew` | REAL_SKILL | Limitações | Três perfis `cavecrew-*` e links para `.agents/README.md` ausentes; usar somente se suporte de subagentes estiver disponível e definir papéis no prompt |
| 9 | `caveman` | REAL_SKILL | Ativo | Comunicação ultra-condensada |
| 10 | `caveman-commit` | REAL_SKILL | Ativo | Commit messages |
| 11 | `caveman-compress` | REAL_SKILL | Ativo com cuidado de escrita | Compacta e sobrescreve o arquivo-alvo após criar backup `.original.md`; exigir escopo explícito e verificar backup |
| 12 | `caveman-help` | REAL_SKILL | Ativo | Referência rápida |
| 13 | `caveman-review` | REAL_SKILL | Ativo | Review de diff |
| 14 | `caveman-stats` | REAL_SKILL | Desativado para roteamento | Hooks requeridos pelo SKILL.md não estão instalados neste pacote |
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
| 29 | `firebase-security-rules-auditor` | REAL_SKILL | **ALTO RISCO** | Auditoria red-team de regras Firestore; nunca edita permissões automaticamente |
| 30 | `web-quality-audit` | REAL_SKILL | **SOB DEMANDA** | Qualidade web, acessibilidade, performance, SEO e browser QA |
| 31 | `deep-research` | REAL_SKILL | Sob demanda | Pesquisa multifuente; conferir fonte/custo |
| 32 | `deploy-to-vercel` | REAL_SKILL | Condicional | Deploy somente com solicitação explícita |
| 33 | `fact-checker` | REAL_SKILL | Sob demanda | Verificação de afirmação com fontes |
| 34 | `find-skills` | REAL_SKILL | Condicional | Descoberta; não instala automaticamente |
| 35 | `mantis-architecture` | REAL_SKILL | Guardrailed | Análise arquitetural |
| 36 | `mantis-critic` | REAL_SKILL | Guardrailed | Crítica de propostas/artefatos |
| 37 | `mantis-report` | REAL_SKILL | Guardrailed | Relatórios, sem patch |
| 38 | `mantis-review` | REAL_SKILL | Guardrailed | Revisão, sem patch por padrão |
| 39 | `mantis-structural-index` | REAL_SKILL | Limitação | Blueprint auxiliar referenciado ausente |
| 40 | `mantis-threat-model` | REAL_SKILL | Guardrailed | Modelagem de ameaças |
| 41 | `planning-with-files` | REAL_SKILL | Condicional | Plano local por missão, sem hooks |
| 42 | `source-tracker` | REAL_SKILL | Condicional | Citações em banco local manual |
| 43 | `clone-website` | REAL_SKILL | Sob demanda | Auditoria comparativa; não copiar identidade, código ou layout proprietário |

**OPERATIONAL_SKILL_PACKAGE_COUNT = 38** (excluindo cópias upstream/backup e referências).

`find-skills` existe no inventário do projeto e também pode existir globalmente.
Superpowers e Ponytail podem ser fornecidos pelo runtime; não copie nem fabrique
shims locais. O conjunto rastreado neste HEAD contém 17 arquivos `SKILL.md`;
conjuntos globais e pacotes locais ignorados devem ser redescobertos em cada
runtime. Neste host, `browser-harness/SKILL.md` e
`browser-harness-main/SKILL.md` têm hash idêntico, mas isso não prova que os
pacotes inteiros sejam duplicados. `archify-main` é cópia upstream, e
`impeccable.bak` é backup preservado; nenhum foi removido.

### Fontes e classificação de disponibilidade

Snapshot de inventário somente leitura em 2026-10-10 (este host):

| Fonte | Pastas/pacotes | `SKILL.md` direto | `SKILL.md` recursivo | Portável? |
|---|---:|---:|---:|---|
| `.agents/skills` do checkout canônico | 43 | 41 | 44 | Não; inclui conteúdo local ignorado |
| `.agents/skills` versionado em clone limpo | 17 | 17 | 17 | Sim, somente esses arquivos |
| Skills de usuário Codex | 7 | 6 | 11 | Não |
| Skills de usuário genéricas | 167 | 167 | 167 | Não |
| Runtime Codex desta sessão | Inventário fornecido pelo runtime | Dinâmico | Dinâmico | Não |

O runtime Codex desta sessão disponibilizou Superpowers e Ponytail; o
`caveman` físico existe no inventário do projeto. Hermes/NVIDIA não é um
runtime conectado nesta sessão. Esses dados são uma fotografia do host, não
um requisito de instalação nem uma garantia para outra sessão.

Classificação para roteamento:

- **CORE**: contrato de processo obrigatório: Superpowers primeiro, Ponytail
  full e Caveman; respeitar instalação real de cada runtime.
- **CONDITIONAL**: selecionar apenas quando a categoria/gatilho pedir e a
  Skill estiver disponível (ex.: Firebase, interface, browser).
- **SPECIALIZED**: ferramenta de nicho, ativada por gatilho explícito; nunca
  carregada por padrão.
- **UNAVAILABLE**: ausente no runtime ou com dependência essencial faltando;
  reportar a lacuna e não instalar/substituir automaticamente.

| Classe | Pacotes/capacidades no roteamento | Regra |
|---|---|---|
| CORE | Superpowers `using-superpowers`, Ponytail full, Caveman | Contrato de processo; Superpowers primeiro. Ponytail é modo, não pacote de Skill local. |
| CONDITIONAL | `doubt-driven-development`, `source-driven-development`, `firebase-security-rules-auditor`, `interface-design`, `web-quality-audit`, `browser-harness`, `playwright`, `browser-testing-with-devtools`, `verification-before-completion`, `caveman-review`, `caveman-commit`, `find-skills` | Selecionar somente por categoria/gatilho, se disponíveis. |
| SPECIALIZED | `archify`, `frontend-design`, `impeccable`, `design-system`, `ui-ux-pro-max`, `ui-styling`, `clone-website`, `brand`, `slides`, `deep-research`, `fact-checker`, Mantis | Uso de nicho; exige motivo específico, nunca carregamento padrão. |
| UNAVAILABLE / LIMITED | `caveman-stats`; `cavecrew`, `banner-design`, `mantis-structural-index` quando suas dependências documentadas faltarem; qualquer Skill não presente no runtime | Bloquear a rota que depende da capacidade faltante e relatar a lacuna. |

Limitações já observadas: `caveman-stats` não entra no roteamento sem os hooks;
`cavecrew` depende de perfis/suporte de subagentes; `banner-design` tem
dependências de geração/exportação ausentes; `mantis-structural-index` aponta
para blueprint ausente. A disponibilidade de scripts, plugins e permissões
deve ser revalidada para a tarefa; a auditoria não executou scripts de Skills.

---

## CLASSIFICAÇÃO OPERACIONAL

### NÃO OPERACIONAIS (não carregar como Skill ativa)
```
archify-main, browser-harness-main, impeccable.bak, references
```

### DUPLICATE/UPSTREAM (cópias preservadas para referência)
```
archify-main → upstream de archify
browser-harness-main → instrução SKILL idêntica à de browser-harness no host auditado
impeccable.bak → backup preservado de impeccable (não validar como runtime ativo)
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

O mapa detalhado de uso por momento do projeto está em
`docs/ai/SKILL_ROUTER.md` e `docs/ai/skills-routing.json`. Use o inventário
físico do runtime como autoridade para decidir disponibilidade.

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
