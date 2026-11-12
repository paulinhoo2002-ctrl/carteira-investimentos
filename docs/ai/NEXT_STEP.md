# Próximo passo oficial

> **Estado atual (SM100.9, 2026-11-12):** memória publicada na branch `docs/sm100-memoria-permanente` (`e1d6bb1`), ainda não integrada ao `main`. O registro canônico é [`REGISTRO_CONTINUIDADE.md`](REGISTRO_CONTINUIDADE.md); o estado resumido está em [`PROJECT_STATE.md`](PROJECT_STATE.md). Este arquivo guarda só o passo de 2026-11-01 e não autoriza nada por estar aqui.

**Próxima prioridade:** homologação Android físico do PWA em `https://sm95-homolog-443691a.vercel.app` (SHA `443691a`, projeto Vercel isolado, apenas homologação). Sem esse resultado, a SM95 não está homologada e a SM94 segue bloqueada.

**Próximas dependências:** Firebase de teste separado (T-FB-01, B-07) e integridade das exportações (T-EXP-01, B-04).

**SM101 em andamento:** worktree `sm101-export-integrity` com alterações não commitadas. Não presumir conclusão nem atualizar hashes sem decisão do proprietário.

**Restrições:** produção intocada; PR #577 em Draft e não integrado; sem deploy, merge ou release sem autorização explícita; dados financeiros reais não homologados (A-02, B-03); sem Firebase de produção nos testes.

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

## Stack analytics/PWA/CI e PDF hardening (2026-11-02)

PRs #545 (`stack/pr4-ci-docs`, acumula pr1→pr2→pr3→pr4: analytics, PWA/security,
CI/docs) e #546 (`integration/m2561-pdf-hardened`, CDN para PDF.js/jsPDF,
remoção de vendor local) abertas como draft, pendentes de CI e revisão.
Conteúdo antigo deste arquivo referente a `feat/financial-evolution-premium`
(M1959/M1960/DR) está superado — essa branch não corresponde ao estado atual
de `main` e seu histórico de certificação DR deve ser revalidado à parte
antes de qualquer reaproveitamento.

## Prioridades

- **P0 (M1960):** Matar server antigo (porta 8795, PID 26724) → `node --test tests/auth-access-browser.test.js` (esperado 6/6 com `dashboard-premium.css` aplicando) → `npm test` completo → remover probes `tests/_probe-axe-detail.js` e `tests/_probe-style.js`
- **P1:** Proprietário exportar backup protegido no app → copiar para `C:\Projetos\_backups\carteira-investimentos\` → criar sidecars SHA-256 → copiar para `redundant\`
- **P2:** `node scripts/backup/verify-integrity.js` → deve dar `INTEGRITY_CHECK=PASS`
- **P3:** `node scripts/backup/verify-recovery.js` (proprietário digita senha no terminal) → deve dar `REAL_RECOVERY_CERTIFIED=YES`
- **P4:** Executar `scripts/dr-drill.sh` (itens 1-3) → medir RTO/RPO reais → atualizar `DISASTER_RECOVERY_PLAN.md`
- **P5:** Checklist DR 100% verde → autorização humana para merge `feat/financial-evolution-premium` → `main` (squash merge, CI verde)

## Limites

- `NO_NEW_FOUNDATION_WORK_WITHOUT_REAL_NEED=YES`.
- `IR2026_REAL_DATA_READY=NO`; `TAX_PAYABLE_STATUS=NOT_CALCULATED`.
- `PACKAGE2_V3_HOSTED_PROMOTED=NO`; qualquer escrita hospedada requer autorização específica.
- `GLOBAL_PATRIMONY_CERTIFIED=NO`.
- Preserve `UNKNOWN != ZERO`, `MISSING != ZERO`, `PARTIAL != COMPLETE` e `EXPECTED != RECEIVED`.
- Não fazer push, PR, merge, deploy, importação ou alteração de dados sem autorização que cubra a ação.
- **Backup real só pode ser exportado pelo proprietário no app** — agentes não têm acesso a credenciais nem UI de produção.

O histórico anterior de próximos passos foi preservado em [`archive/NEXT_STEP_HISTORY_TO_2026-10-17.md`](archive/NEXT_STEP_HISTORY_TO_2026-10-17.md).
