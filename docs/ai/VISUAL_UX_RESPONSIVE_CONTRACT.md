# Contrato permanente de UX visual e responsividade — LEGACY

`VISUAL_UX_RESPONSIVE_CONTRACT=CANONICAL`
`SLIM_UI_CONTRACT=PERMANENT`
`RESPONSIVE_CONTRACT=PERMANENT`

Este documento governa comportamento, responsividade, acessibilidade e validação visual da interface LEGACY. [`VISUAL_CANON_V2.md`](VISUAL_CANON_V2.md) continua sendo a referência para linguagem visual e componentes; este contrato complementa o canon sem duplicá-lo. Regras financeiras, persistência, segurança e gates de Git em `AGENTS.md`, `PERMANENT_OPERATING_CONTRACT.md` e `PRODUCT_CONTRACTS.md` prevalecem.

## Estado e escopo

Em 2026-10-18, `VISUAL_PHASE=ACTIVE_FOR_PR_503` para a linha oficial `PR #503`, branch `feat/legacy-slim-ui-refinement-2026-10-17`. Confirme PR, branch e HEAD no GitHub antes de continuar trabalho visual. Essa autorização é limitada à linha e ao escopo visual aprovados; não revoga o freeze geral nem libera mudança financeira, fiscal, de persistência, Auth, Firebase, Rules ou deploy. Ao fechar a PR, atualize o estado do projeto e reavalie a fase.

## Princípios de apresentação

- `SUMMARY_FIRST`, `DETAILS_ON_DEMAND`, `PROGRESSIVE_DISCLOSURE`: mostre primeiro o essencial, mantenha informações secundárias recolhidas e revele detalhes quando pedidos.
- Reduza ações sempre visíveis, containers aninhados e ruído visual sem remover capacidades.
- KPIs primários, avisos críticos, ação principal e campos obrigatórios permanecem visíveis.
- O padrão aprovado de Ativos é referência: resumo por categoria, grupos fechados inicialmente, cartões no celular, busca/filtro abrindo a categoria pertinente e ações contextuais acessíveis por teclado e ponteiro.
- Use superfícies sólidas, hierarquia clara, ícones SVG e elevação discreta. Evite brilho decorativo, gradientes genéricos, emojis como ícones profissionais e cards aninhados sem necessidade.

## Responsividade

Valide rotas principais nas larguras `360`, `390`, `412`, `430`, `768`, `1024`, `1366`, `1440` e `1920` CSS px. Use alturas representativas para celular, tablet e desktop. Em toda rota alterada, confirme:

- sem overflow horizontal do documento;
- conteúdo essencial sem corte e ações essenciais alcançáveis;
- geometria intencional para o viewport;
- foco visível e navegação por teclado;
- alvos de toque principais com pelo menos `44×44` CSS px quando aplicável.

Registre uma rota como não afetada somente com justificativa verificável. Uma falha responsiva bloqueia a certificação visual daquela mudança.

### Estratégia de tabelas

- Desktop: tabela completa quando a densidade analítica for útil.
- Tablet: apresentação compacta ou adaptativa, mantendo as colunas e ações necessárias alcançáveis.
- Celular: cartões, linhas expansíveis ou detalhes sob demanda. Não comprima a tabela desktop para caber.
- Se a rolagem horizontal for necessária, mantenha-a dentro do componente, com foco/teclado e sem overflow global; prefira a representação adaptativa no celular.

Não corrigir geometria com `overflow-x:hidden` em `html`/`body`, `zoom`, `transform:scale`, corte de conteúdo ou ocultação de ações essenciais.

## Tipografia e dados

- Corpo preferencial: `14–16px`.
- Ações, labels funcionais e conteúdo normal legível: `12px` ou mais; metadados secundários podem usar `11px`; `10px` fica restrito a microtexto excepcional e não crítico.
- Escala preferida: `24`, `18`, `16`, `14`, `12`, `11px`.
- Pesos usuais: `400` corpo, `500` interface, `600` ênfase e `700` títulos; `800/900` exigem justificativa específica.
- Números financeiros usam `font-variant-numeric:tabular-nums` e alinhamento à direita em colunas apropriadas.
- Não diminuir texto nem espaçamento para fazer uma tela caber.

## Tokens, espaço e temas

- Prefira tokens semânticos existentes para texto, texto secundário, destaque, superfícies, borda, ação, estados positivo/negativo/aviso/informação, foco e desabilitado.
- Evite introduzir novos valores de cor hardcoded quando um token existente expressa o significado.
- Baseie novos espaçamentos no ritmo de `4px`: `4`, `8`, `12`, `16`, `20`, `24`, `32px`. Use raios pequenos para controles, médios para cards/painéis e completos para pílulas.
- Verifique toda área alterada em tema claro e escuro. Contraste e semântica de cor devem permanecer claros nos dois.

## Acessibilidade e interação

- `:focus-visible`, fluxo de teclado, nomes acessíveis, labels, headings e semântica de tabelas são requisitos permanentes.
- Menus, accordions e disclosures expõem estado, incluindo `aria-expanded` quando aplicável; nenhuma ação essencial pode depender de hover.
- Respeite `prefers-reduced-motion`; SVGs informativos têm alternativa textual acessível.
- Execute Axe nas rotas alteradas; objetivo `critical=0` e `serious=0`, complementado por revisão de teclado, foco, contraste e alvos de toque.
- Estados loading, vazio, erro, parcial, desconhecido, somente leitura e desabilitado devem ser distinguíveis. Ausência não pode parecer zero confirmado.

## Rotas e QA visual

Rotas principais: Dashboard, Ativos, Lançamentos, Renda Fixa, Dividendos, Rentabilidade, Rebalancear, Metas, Relatórios, IRPF e Configurações. Em mudança visual, teste todas as rotas afetadas e registre as não afetadas com motivo.

Use seletores semânticos estáveis (`role`, nome acessível, estado funcional e `data-testid` somente quando necessário). Valide navegação, tabs, filtros, ordenação, expansão, ações e overflow. Registre erros de console novos e falhas de página relevantes. Revise screenshots antes/depois de cada mudança substancial em artefato local ignorado; screenshots com dados financeiros reais nunca entram no Git.

## Limites financeiros

A camada visual apresenta valores e estados canônicos; não cria cálculos, cobertura, projeções, custo médio ou reconciliações. Preserve `UNKNOWN != ZERO`, `MISSING != ZERO`, `PARTIAL != COMPLETE` e `EXPECTED != RECEIVED`. Mudanças em Finance Core, fiscal, persistência, Firebase, Auth, Rules, backups ou dados hospedados exigem fase e autorização próprias.
