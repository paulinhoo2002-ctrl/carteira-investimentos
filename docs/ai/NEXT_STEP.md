# Próximo passo oficial

OPERATING_MODE=DR_REVALIDATION_THEN_CERTIFICATION_AND_MERGE
VISUAL_PHASE=M1959_COMPLETE
QA_FIX=M1960_MIME_APPLIED_PENDING_RETEST

## Ação atual

**P0: Revalidação M1960 do QA local** (bug MIME corrigido — ver M1960 em `PROJECT_MEMORY.md`) → **Certificação DR completa** → autorização para merge `feat/financial-evolution-premium` → `main`.

M1959 concluída: reconciliação HEAD verificada, melhorias M1955/M1958 preservadas (Ativos tabela premium + cards mobile, Dividendos KPIs canônicos + disclosure, semântica ±verde/vermelho, filtros UX, readonly preview), `verify:release` PASS (273+ testes, 39 visual regression, 0 erros), QA smoke 7 viewports limpo, galeria visual 8 capturas, preview sintético read-only ativo.

DR Plan documentado em `docs/DISASTER_RECOVERY_PLAN.md`. Gaps: backup real não exportado, diretório aprovado inexistente, sidecars SHA-256 ausentes, drills não executados.

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
