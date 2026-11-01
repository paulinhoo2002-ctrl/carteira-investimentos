# Próximo passo oficial

OPERATING_MODE=MAINTENANCE_AND_DATA_CERTIFICATION_MODE
VISUAL_PHASE=UX_OVERLOAD_REDUCTION_IN_PROGRESS (PR #542)

## Estado em 2026-11-01

Branch `ux/ativos-abas-backup`, PR #542 (draft, não mergeada). `origin/main`
ainda em `941d311` (PR #541) — nenhuma correção abaixo está em produção.

Três correções pontuais já commitadas e com CI verde nessa branch, em
resposta direta à queixa do proprietário ("muita informação, difícil de
entender"):

1. `169e4ff` — Dashboard: removida `dashboardPlainSummary()`, eliminando
   patrimônio e alerta duplicados na tela de início.
2. `317d149` — Dividendos: 4 dos 5 cards de KPI que mostram "—" em carteiras
   sem 12 meses de histórico agora aparecem visualmente discretos (borda
   tracejada, opacidade reduzida), sem reordenar/remover/renomear nada —
   preserva locks posicionais de `v289-visual-regression.test.js` e
   `v333-dividend-month-coverage.browser.test.js`.
3. `26f0bf7` — `v250-runtime.js`: `SW_CACHE` estava desatualizado
   (`v250.1` vs. `v250.3` real em `sw.js`), causando falso-positivo
   permanente no diagnóstico `checkVersionCoherence()`. Corrigido. Isto NÃO
   foi confirmado como causa raiz do bug relatado de splash travado no PWA
   mobile (vídeo do usuário, 2026-11-01) — falta log de console capturado no
   momento da falha. `sw.js` não foi tocado (área protegida).

Ativos foi auditado nesta sessão e não apresenta problema análogo (já bem
estruturado, sem KPI vazio/duplicado). Rentabilidade mostra vários
"Indisponível" no fixture sintético de QA — isto é comportamento protegido
(`FINANCIAL_MISSING_DATA_RULE=true`, não fabricar retorno histórico sem
série de preços), não um bug; provável artefato do fixture sintético, a
confirmar contra dados reais do proprietário.

## Ação atual

1. **Bloqueado no usuário:** marcar PR #542 ready-for-review e fazer squash
   merge manualmente no GitHub. Claude Code tem restrição própria de
   classificador que impede chamadas de API que mudam estado de PR —
   confirmado, não contornável.
2. Após merge: confirmar em produção (Vercel, tracking `main`) que as 3
   correções aparecem e que o bug de splash travado do PWA não se repete.
3. Pendente do lado do usuário: screenshot da carteira pública Investidor10
   (`investidor10.com.br/wallet/public/2206425` — bloqueado por robots.txt
   para fetch direto) e acesso a `G:\Meu Drive\Codex\skills` (PC sem energia
   em 2026-11-01).
4. Reconstrução completa da tela de início no padrão "Model A" (hero +
   sparkline, grid 2 colunas) continua bloqueada por ~10 arquivos de teste
   com lock posicional em `executiveKPIs()`/`dashboardV3PriorityPanel()`;
   decisão pendente do proprietário entre reescrever esses testes ou aceitar
   versão intermediária (CSS/reorganização sem tocar estrutura testada).

## Prioridades

- **P0:** corrigir incidente real de produção, segurança ou corrupção de dados.
- **P1:** ingerir e certificar evidência fiscal real em modo read-only/dry-run.
- **P2:** avaliar promoção hospedada do Package2 V3 após identidade do proprietário, leitura exata, diff e autorização de escrita específicos.
- **P3:** reconciliar patrimônio global, custodiantes, datas e sobreposição.
- **P4:** tratar dívida técnica de privacidade preexistente.
- **P5:** implementar melhorias opcionais de UX apenas diante de benefício e necessidade demonstráveis.

## Limites

- `NO_NEW_FOUNDATION_WORK_WITHOUT_REAL_NEED=YES`.
- `IR2026_REAL_DATA_READY=NO`; `TAX_PAYABLE_STATUS=NOT_CALCULATED`.
- `PACKAGE2_V3_HOSTED_PROMOTED=NO`; qualquer escrita hospedada requer autorização específica.
- `GLOBAL_PATRIMONY_CERTIFIED=NO`.
- Preserve `UNKNOWN != ZERO`, `MISSING != ZERO`, `PARTIAL != COMPLETE` e `EXPECTED != RECEIVED`.
- Não fazer push, PR, merge, deploy, importação ou alteração de dados sem autorização que cubra a ação.

O histórico anterior de próximos passos foi preservado em [`archive/NEXT_STEP_HISTORY_TO_2026-10-17.md`](archive/NEXT_STEP_HISTORY_TO_2026-10-17.md).
