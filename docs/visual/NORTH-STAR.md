# Visual Product North Star

> Referencia permanente de direcao visual e funcional do produto Carteira de Investimentos.
> Qualquer agente (Hermes, Codex, Claude Code, OpenCode, Copilot) deve consultar
> este documento antes de iniciar qualquer fase visual.

## 1. Direcao Visual

### Premium Dark

O padrao visual oficial e premium dark, aprovado e consolidado nas Fases 11-12
(Visual Master). Este e o baseline visual permanente do produto.

Nao reinventar o tema; refinar, elevar, polir.

### O que NAO e o North Star

- Copiar identidade visual de outro produto
- Dashboard poluido com muitos cards
- Excesso de glow, gradientes decorativos ou cards gigantes
- Aparencia generica de template de IA
- Informacao repetida para preencher espaco
- Decoracao sem funcao

### O que E o North Star

1. **Visual premium proprio** — identidade visual propria, reconhecivel
2. **Profundidade financeira** — dados densos, claros, profundos
3. **Clareza** — hierarquia visual inequivoca; o olho sabe onde ir
4. **Inteligencia para decisao** — dados conduzem ao contexto, que conduz a decisao

### Formula do produto

```
DADOS → CONTEXTO → INTERPRETACAO → PRIORIDADE → DECISAO
```

O produto nao entrega apenas numeros. Entrega compreensao.

## 2. Referencia de Produto

### Investidor10 (referencia de profundidade, NAO de visual)

Referencia de:
- Densidade informacional
- Profundidade historica
- Posicoes detalhadas
- Proventos e renda passiva
- Patrimonio e evolucao
- Rentabilidade e benchmarks
- Organizacao de informacoes financeiras

**NAO copiar identidade visual do Investidor10.**

O objetivo e combinar:
1. Visual premium proprio
2. Profundidade financeira do Investidor10
3. Clareza e hierarquia visuais
4. Inteligencia para tomada de decisao

## 3. Diretrizes de Design

### Hierarquia Visual

- Um ponto focal por tela; tudo mais e suporte
- 3 niveis de hierarquia: primario (dados principais), secundario (contexto), terciario (metadata)
- KPIs grandes e pesados; labels pequenos e muted
- Nunca tudo do mesmo tamanho/peso

### Tipografia

- Typeface base: sistema (-apple-system, BlinkMacSystemFont, Segoe UI)
- Tabular numbers para todos os dados numericos
- Hierarquia por peso (600/700/800/900), nao apenas por tamanho
- Line-height responsivo: 1.1 para titulos, 1.35-1.45 para corpo

### Espacamento e Grid

- Base unit: 4px (multiplos de 4 sempre)
- Cards: padding 14-16px desktop, 11-12px mobile
- Bordas: 12px radius desktop, 11px mobile
- Grids: responsivos com minmax e auto-fit
- Sidebar: 200-216px desktop, hidden mobile (bottom nav)

### Cores

- Dark: fundo #0b1220, painel #121d2f, texto #f0f5ff
- Acentos: verde (#34d399 positivo), azul (#60a5fa info), vermelho (#f87171 negativo), amarelo (#fbbf24 alerta)
- Contraste minimo: 4.5:1 para texto corpo, 3:1 para texto grande
- Nunca mais de 2 acentos por area

### Cards e Superficies

- Superficies empilhadas com elevacao sutil
- Bordas em rgba com opacity baixa (0.06-0.12)
- Sombras apenas para elevacao (nunca decorativas)
- Nunca misturar bordas + sombras no mesmo elemento

### Tabelas

- Fonte 11-13px, tabular-nums
- Header sticky com background
- Hover sutil (surface-2)
- Alternancia de linha opcional (zebra)
- Scroll horizontal em mobile (overflow-x:auto)
- Min-width adequado; nunca contenido ilegivel

### Graficos

- Coherentes com a paleta do produto
- Tooltips informativos com contexto
- Legendas compactas
- Sem grid excessivo

### Navegacao

- Sidebar lateral fixa em desktop (>=1181px)
- Bottom nav em mobile (<=640px)
- Tabs internas para sub-areas
- Breadcrumbs quando necessario

### Responsividade

Viewports de validacao obrigatoria:
- 390x844 (mobile pequeno)
- 430x932 (mobile medio)
- 768x1024 (tablet)
- 1366x768 (notebook)
- 1920x1080 (desktop)

Em cada viewport:
- Nenhum overflow horizontal
- Numeros nunca cortados
- R$ e % nunca quebrados
- Graficos legiveis
- Tabelas funcionais
- Navegacao acessivel
- Touch targets >= 44px

### Acessibilidade

- Contraste WCAG AA minimo
- Focus-visible em todos os interativos
- Aria labels em icones
- Skip links quando necessario
- Leitura por screen reader

## 4. Telas e Prioridades

### Dashboard (Prioridade 1)

Painel executivo. O usuario deve responder rapidamente:
1. Quanto tenho?
2. Quanto investi?
3. Quanto ganhei/perdi?
4. Como esta minha rentabilidade?
5. Quanto recebi de renda?
6. Como minha carteira esta distribuida?
7. Como meu patrimonio esta evoluindo?
8. O que vou receber?
9. O que merece minha atencao?
10. Existe alguma acao importante agora?

Maximo de 3 itens realmente importantes (Priority Review).
Fila completa na area IA.

### Ativos / Posicoes (Prioridade 2)

Investidor10 como referencia de profundidade.
Desktop: tabela financeira de alta qualidade.
Mobile: representacao adequada ao espaco (nao apenas comprimir a tabela).

### Dividendos (Prioridade 3)

Uma das principais referencias visuais.
- Recebido no ano, media mensal, ultimo mes, projecao
- Historico mensal com comparacao anual
- Principais pagadores, proximos recebimentos
- Renda passiva e meta de renda

### Rentabilidade (Prioridade 4)

Carteira vs CDI vs IPCA vs benchmarks suportados.
Diferenciar: mes, ano, 12 meses, acumulado, desde o inicio.
Toda metrica usa fontes/calculos existentes.

### Patrimonio (Prioridade 5)

Evidenciar: crescimento por aporte vs crescimento por rentabilidade.
Patrimonio atual, evolucao, composicao, distribuicao.

### Aportes + Metas (Prioridade 6)

### Rebalanceamento + IA/Analise (Prioridade 7)

### Relatorios / Auditoria / Telas Secundarias (Prioridade 8)

## 5. Seguranca Funcional

NUNCA alterar sem necessidade:
- Calculo financeiro (finance-core.js)
- Regras de compra/venda
- Proventos
- Renda fixa
- Patrimonio
- Rentabilidade
- Persistencia (persistence-core.js)
- Import/export
- Dados existentes

Visual nao pode criar uma segunda fonte de verdade.

## 6. Areas Protegidas

Nao alterar sem autorizacao explicita:
- Formulas financeiras
- Dados historicos persistidos
- Schema, persistencia, localStorage
- Firebase, Auth, sincronizacao, backups
- firestore.rules, sw.js, manifest.json
- finance-core.js, persistence-core.js
- modern/src, modern/dist
- Logica de "zero versus ausencia"

## 7. Iteracoes Planejadas

| Iteracao | Escopo | Status |
|----------|--------|--------|
| 1 | Design System + shell + navegacao + Dashboard | Em progresso |
| 2 | Ativos / Posicoes | Pendente |
| 3 | Dividendos | Pendente |
| 4 | Rentabilidade + Patrimonio | Pendente |
| 5 | Aportes + Metas | Pendente |
| 6 | Rebalanceamento + IA/Analise | Pendente |
| 7 | Relatorios / Auditoria / Telas Secundarias | Pendente |

Apos cada iteracao: browser QA, testes, comparacao visual, correcao de regressoes.

## 8. Regras para Agentes

1. Consultar este documento antes de iniciar fase visual
2. Seguir o AGENT STARTUP PROTOCOL
3. Nao misturar mudancas visuais com fases funcionais
4. Criar branch propria por iteracao
5. Validar em todos os viewports obrigatorios
6. Rodar testes antes e depois
7. Documentar decisoes no PROJECT_MEMORY.md
8. Parar para autorizacao antes de commit/push/merge

---

*Documento criado: 2026-08-26*
*Fase: Visual Product North Star*
*Branch: feat/visual-product-north-star*
