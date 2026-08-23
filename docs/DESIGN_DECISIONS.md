# Design Decisions

## Referências Visuais Oficiais

### Hierarquia de Referências

| Prioridade | Fonte | Papel | Aplicação Principal |
|------------|-------|-------|---------------------|
| 1 | **Visual Master** | **PRIMARY VISUAL REFERENCE** | Alvo visual oficial do produto — dark premium, sóbrio, profissional, alta densidade útil |
| 2 | **index2027** | **STRONG COMPLEMENTARY REFERENCE** | Patrimônio (top posições, distribuição por instituição, perfil risco, alocação detalhada, evolução), Rentabilidade (evolução temporal, comparação benchmark, períodos 7D/1M/1A/5A, por classe), Rebalanceamento (Atual%, Ideal%, Diferença, Ajuste sugerido, comparação visual), Navegação (hierarquia módulos, agrupamento Principal/Análise/Sistema, submenu organizado), UI (cards compactos, tabelas densas, badges discretos, modais, toasts, gráficos, calendário recebimentos) |
| 3 | **index2025** | **STRONG COMPLEMENTARY REFERENCE** | Sidebar agrupada, cards KPI compactos, tabelas densas, badges semânticos, metas/progresso, rebalanceamento, relatórios, IRPF, IA, modais, toasts, estados da interface, Dashboard, Dividendos |
| 4 | **index2024** | **COMPLEMENTARY REFERENCE** | Filtros, busca, organização de telas, composição dos painéis, controles contextuais, detalhes de UX, densidade visual |
| 5 | **Implementação Atual** | **FUNCTIONAL SOURCE OF TRUTH** | Única fonte para cálculos financeiros, persistência, dados, regras, fluxos, funcionalidades |

### Regras Fundamentais

- **NÃO** copiar: state, localStorage, dados simulados, cálculos, regras financeiras, modelos de dados, persistência, fluxos CRUD dos protótipos
- Protótipos são **SOMENTE** referência de: UI, UX, hierarquia, navegação, densidade, organização visual, componentes, responsividade
- Em conflito: Segurança dos dados → Lógica financeira → Arquitetura/domínio → Usabilidade → Responsividade → Visual Master → index2027 → index2025 → index2024

## Aprendizados

- um protagonista por tela
- grafico secundario quando aplicavel
- historicos integrados a pagina
- espaco como ferramenta de hierarquia
- menos containers
- mobile projetado e nao apenas adaptado
- prototipo aprovado antes da implementacao
- mudancas pequenas e isoladas por branch
- fundacao visual e funcionalidade seguem escopos separados
- Dividendos V4 mostrou que leitura compacta precisa de menos caixas, nao de mais aderecos

## Decisao atual

Adotar um Design System gradual, compativel com o legado e sem migracao disruptiva.

## Separacao de escopo

- a fundacao visual nao altera regra de negocio
- tokens e documentos vem antes de migracao de componentes
- telas novas continuam usando o mesmo contrato visual
- Sprint 3.1 nao substitui telas; apenas fixa linguagem

## Regra de continuidade

- nao remover o legado antes da cobertura nova existir
- nao substituir tudo de uma vez
- nao introduzir tokens sem uso planejado
- nao misturar modernizacao com redesenho amplo

## Decisoes adiadas

- biblioteca de componentes
- migração ampla de telas
- refatoracao visual do legado

## Criterio de sucesso

- mesma linguagem visual entre telas
- menos variacao improvisada
- previsibilidade em componentes
- facilidade de migrar por fase
- zero regressao funcional

---

## Direção Visual Oficial

O produto deve evoluir para:

- **Dark premium** — fundo escuro sofisticado, não genérico
- **Sóbrio** — pouco ornamento, foco na informação
- **Profissional** — sensação de plataforma financeira real
- **Alta densidade útil** — muito espaço desperdiçado removido
- **Hierarquia forte** — protagonista claro por tela
- **Números financeiros escaneáveis** — tabular-nums, peso, cor semântica
- **Bordas discretas** — estrutura invisível, separação por espaço/tom
- **Cores semânticas** — verde=ganho, vermelho=perda, dourado=primário/marca
- **Componentes consistentes** — mesmo token, mesmo comportamento

### Evitar

- Cards gigantes
- Excesso de glow/brilho
- Gradientes chamativos
- Excesso de cores simultâneas
- Layouts duplicados
- Painéis redundantes
- Aparência de template genérico

---

## Sidebar — Estrutura Preferencial

Registrar como direção preferencial uma navegação lateral organizada.

### Agrupamento Proposto

| Grupo | Itens (apenas existentes) |
|-------|---------------------------|
| **PRINCIPAL** | Dashboard, Patrimônio, Ativos, Aportes, Metas, Dividendos, Renda Fixa, Rentabilidade, Rebalancear |
| **ANÁLISE** | Relatórios, IRPF, Auditoria, IA Assistente |
| **SISTEMA** | Configurações |

### Regras

- **Só manter itens que realmente existam no produto**
- Não criar telas fake para preencher menu
- Itens não implementados: documentar como evolução futura, não mostrar na navegação
- Desktop: sidebar fixa ~260px; Mobile: bottom nav (4 itens) + drawer "Mais" com seções

---

## Alvos de Responsividade

### Prioridade Máxima

| Dispositivo | Viewport | Observação |
|-------------|----------|------------|
| **Desktop principal** | 1366x768 | Notebook Dell 14" — dispositivo real de uso |
| **Mobile principal** | 390x844 | Samsung Galaxy S25 6,2" — dispositivo real de uso |

### Também Validar

| Viewport | Dispositivo |
|----------|-------------|
| 430x932 | iPhone 15 Pro / Android grandes |
| 768x1024 | iPad portrait |
| 1920x1080 | Desktop Full HD |

### Requisitos Obrigatórios

- Zero overflow horizontal global
- Touch targets ≥ 44px (preferência 48px)
- Safe-area inset respeitada (notch, home indicator)
- Textos sem colisão/corte crítico
- Tabela desktop NÃO espremida no mobile — cards/lista própria
- Experiência mobile própria, não apenas adaptada

---

## Aba Ativos — Decisão Oficial (Fase 2 Concluída)

A implementação na PR #319 define o padrão oficial para a aba Ativos:

### Preservado

- ✅ Busca global com debounce
- ✅ Filtros por classe (dropdown com contadores)
- ✅ KPIs superiores compactos (5 cards: Total investido, Valor atual, Lucro/Prejuízo, Rentabilidade, Qtd ativos)
- ✅ Tabela desktop premium (sticky header, colunas por prioridade, badges de classe, tabular-nums)
- ✅ Cards mobile expansíveis (`<details>`) com ações (Comprar/Vender/Editar) touch targets ≥48px
- ✅ Ações preservadas via `assetActionMenuHtml()`

### Removido (Deduplicação)

- ❌ Painel grande "Distribuição da carteira"
- ❌ Listas duplicadas por categoria (Ação, FII, ETF, Renda Fixa, etc.)
- ❌ Blocos redundantes abaixo da listagem principal

### Princípio

**Uma única listagem principal de ativos.** A separação por classe acontece exclusivamente através dos filtros/menu já existentes.

---

## Próximas Telas — Roadmap Visual

| Ordem | Tela | Status | Notas |
|-------|------|--------|-------|
| 1 | Dashboard Premium | ✅ Concluído | Visual Master aprovado |
| 2 | Ativos Premium | ✅ Concluído | PR #319 merged, em produção |
| 3 | Dividendos Premium | 📋 Próxima fase | |
| 4 | Aportes Premium | 📋 Planejado | |
| 5 | Renda Fixa Premium | 📋 Planejado | |
| 6 | Metas Premium | 📋 Planejado | |
| 7 | Patrimônio Premium | 📋 Planejado | |
| 8 | Rentabilidade Premium | 📋 Planejado | |
| 9 | Rebalanceamento Premium | 📋 Planejado | |
| 10 | Relatórios | 📋 Planejado | |
| 11 | IRPF | 📋 Planejado | |
| 12 | IA Assistente | 📋 Planejado | |

> **Não implementar essas próximas telas agora.** Apenas documentar a direção visual.

---

## Skills Preferidas para Próximas Fases

Consultar as Skills existentes do próprio projeto:

| Skill | Uso Preferido |
|-------|---------------|
| `interface-design` | Design de telas, hierarquia, componentes |
| `design-system` | Tokens, componentes, migração gradual |
| `browser-testing-with-devtools` | Validação visual real em viewports |
| `playwright` | Testes responsivos automatizados |
| `impeccable` | Atenção a detalhes, craft, consistência |
| `doubt-driven-development` | Decisões baseadas em evidência |
| `source-driven-development` | Grounding em documentação oficial |

**Não instalar Skills externas nesta etapa.**

---

## Proteções Absolutas

**NÃO alterar em nenhuma fase de documentação/visual:**

- `finance-core.js` / `persistence-core.js`
- `manifest.json`, `sw.js`, `firestore.rules`
- `package.json`, `package-lock.json`
- `.github/workflows/ci.yml`
- `modern/`, `tests/`

Esta fase trabalha **APENAS em documentação**.

---

## Estratégia Git

### PR #319 (Ativos Premium) — CONCLUÍDA

- Merge realizado via merge commit (8ba30fb)
- Deploy Vercel produção: SUCCESS

### Documentação — Esta Branch

- Branch: `docs/visual-master-references`
- Commit local apenas
- Não push, não PR, não deploy até aprovação