# MEGA 13 — checkpoint técnico (2026-10-12)

## Identidade

- Projeto: `paulinhoo2002-ctrl/carteira-investimentos`.
- Worktree: `C:/Projetos/carteira-investimentos.worktrees/v012-mega-12-lifetime-redesign`.
- Branch: `codex/legacy-product-mega-12`.
- HEAD de retomada: `65d0cf541338dbb937dc81cdfdff4177228b4a49`; worktree limpa antes da MEGA 13.
- Remote e Git common-dir conferidos; checkout canônico sujo e demais worktrees preservados.

## Trabalho concluído nesta MEGA 13

- Extraídos `showLineChartTooltip`, `hideLineChartTooltip` e `lineChart` de `index.html` para `legacy/js/ui/charts.js`. O renderer segue somente apresentação; os callers existentes permanecem no HTML e receberam o script antes do código da aplicação.
- Atualizados o app shell do service worker e a expectativa de cache de `v250.4` para `v250.5`; o novo módulo também entrou no build estático e no conjunto offline.
- Adicionados testes do renderer real para intervalo desconhecido, zero confirmado, resumo acessível, série sem pontos e ocultação de valores. Testes que procuravam a função no HTML agora validam o módulo em uso.
- Cinco ícones de tipo de movimentação usam SVG local acessível por `aria-hidden`, em vez de emojis; os rótulos funcionais permanecem textuais.
- Seis declarações funcionais identificadas em notas, ajuda de backup e prévia de movimentação passaram a 12 px. A contagem estática de `font-size` explícito até 11 px caiu de 797 para 791; `!important` permaneceu 932 e `@media` permaneceu 212.
- Corrigido um harness de backup dry-run que pressupunha uma pasta externa já criada. O teste agora cria uma raiz temporária própria e sintética, injeta-a somente no processo de teste, confirma ausência de ZIP e continua bloqueando destino fora da raiz. O guard de backup e o script operacional não foram alterados.
- `index.html`: 1.778.114 → 1.770.022 bytes; 29.245 → 29.110 linhas; JS inline 1.772.048 → 1.763.909 bytes. A extração foi limitada ao renderer; o restante da aplicação inline não foi reescrito.

## Evidência de validação

- `npm test`: PASS.
- `npm run test:modern`: PASS, 823/823.
- `npm run qa:all`: PASS; smoke em 390, 430, 768, 1366, 1440, 1536 e 1920 px sem overflow, erro de console, erro de página ou falha de requisição relevante.
- `npm run test:visual-regression`: PASS, V289 18/18; cobre a matriz responsiva (incluindo 360 px), temas claro/escuro, Axe nos fluxos alterados e movimento reduzido. V324 17/17 roda dentro da suíte Legacy.
- `npm run verify:release`: PASS no estado da implementação antes do checkpoint documental.
- Testes focados do renderer, service worker, backup e apresentação: PASS; backup dry-run não criou arquivo. UTF-8 (21 arquivos), `git diff --check` e `scripts/maintenance/root-hygiene-check.js`: PASS.
- Capturas de QA sintético geradas em `.qa-state/v330-daily-use/`. Não houve comparação dedicada de screenshot para a extração do chart, pois a saída visual do renderer foi preservada; a matriz browser confirmou a renderização.

## Limitações e segurança

- O build Modern continua emitindo warnings preexistentes sobre script clássico sem `type="module"`, export default e `MODULE_TYPELESS_PACKAGE_JSON`; os builds e testes passaram.
- Modularização adicional do JavaScript inline não foi feita nesta etapa; os fluxos de domínio, estado e Finance Core foram mantidos fora do escopo de extração.
- Nenhum dado financeiro real, backup real, Firebase hospedado, OAuth ou Vercel foi usado. `finance-core.js`, `persistence-core.js`, regras Firebase e `package-lock.json` não foram alterados.
- Nenhum processo desconhecido foi encerrado. Nenhuma worktree foi removida.
- Sem push, PR, merge ou deploy. Commits locais `81e93ea`, `754b5c6`, `28ed800` e `ce683e4`; HEAD final `ce683e4c6fa402b0c15a5cd2d1983489af5aae04` e worktree limpa antes desta atualização.

## Próxima ação segura

A revisão final dos commits foi concluída. Próximo passo: avaliação humana e autorização de publicação, se desejada. A missão não autoriza push, PR, merge ou deploy.
