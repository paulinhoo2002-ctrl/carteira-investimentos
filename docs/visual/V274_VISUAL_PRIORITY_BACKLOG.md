# V274 — Backlog priorizado para o redesign

Ordenação por impacto no usuário observável, não por facilidade.

## P0 — Acessibilidade

- Medir e corrigir foco de teclado em toda navegação/controle/modal; confirmar
  retorno de foco e contraste do focus ring.
- Verificar nomes acessíveis em formulários e controles de ícone, além de
  semântica `status`/`aria-live` dos toasts sem anúncio duplicado.
- Axe por rota e estado (dark/light, vazio/erro/conteúdo), com zero critical e
  serious. Dark/sintético passou 0/0 em 17 rotas x 390/1366. Varredura clara
  adicional (68 combinações totais em ambos os temas/larguras) teve zero
  critical e três observações rota/largura com serious: Dashboard em 390 e 1366
  e Relatórios em 1366. A maior parte dos contrastes claros foi corrigida, mas
  as superfícies variáveis do Dashboard e os muitos componentes V254 em
  Relatórios ainda exigem correção/validação; axe não está certificado 0/0.
- Achados runtime V274 (axe, 17 rotas x 390/1366, antes de correções): contraste
  em Ativos/Aportes/Análise/Relatórios/Metas/IA; regiões roláveis sem foco em
  Dividendos/Confiabilidade/Relatórios/Metas; um `nested-interactive` em Metas.
  O nome acessível do select IRPF, contraste pontual, regiões roláveis e nested
  action foram corrigidos; matriz dark passou 0 critical/serious. Esses achados
  não são tratados como exceções preexistentes.

## P1 — Conforto e legibilidade

- Revisar textos visíveis muito pequenos, especialmente labels/captions de
  9–10px e exemplos em cartões/tabelas; buscar >=12px para leitura comum sem
  impor 16px global.
- Conferir contraste de `--primary` quando renderizado como texto e preservar
  usos de superfície/botão que já sejam legíveis.
- Diferenciar alta/baixa por sinal textual/ícone além de verde/vermelho.

## P1 — Mobile e tablet

- Resolver clipping/colisão de tabelas, começando pelo Dashboard desktop largo;
  testar também comportamento em 390, 430 e 768.
- Medir hitboxes >=44×44 e footprint/safe-area da navegação, sem redesign
  automático do padrão de navegação.
- Verificar 125%/150% zoom e conteúdo essencial.

## P1 — Temas e foco visual

- Revisar dark/light em todas as superfícies legadas críticas, especialmente
  texto muted, placeholders, disabled, gráficos e status.
- Validar theme-color mobile e foco sobre a superfície imediata.

## P2 — Consistência visual

- Alinhar números de moeda/percentual com tabular numerals onde melhora leitura.
- Melhorar empty states apenas com instrução/CTA executável e verdadeira.
- Padronizar ícones mediante inventário; SVG decorativo `aria-hidden`, ícone
  informativo nomeado, sem migração global de tecnologia.
- Melhorar legibilidade de gráficos e avaliar badges semânticos nos KPIs sem
  codificar significado apenas por cor.

## P2 — Sistema de design

- Consolidar tipografia/espaçamento/radius por etapas e aliases opt-in; medir
  tokens repetidos antes de migrar estilos inline.
- Manter os padrões de tela específicos e visuais congelados; sem extração ampla.

## P3 — Dívida técnica

- Reduzir CSS duplicado/inline/`!important` somente depois de benefício visual
  demonstrável e regressão coberta.
- Consolidar breakpoints só após confirmar que não são pares intencionais
  `max-width:N` / `min-width:N+1`.
- Capturar baseline de performance antes de adotar qualquer limite.
