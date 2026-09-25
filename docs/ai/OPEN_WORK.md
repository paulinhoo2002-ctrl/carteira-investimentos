# Trabalho aberto

## NOW

- PR #413 V263 visual/compiled QA is complete on the exact verified head; preview SSO prevented authenticated real-portfolio QA in this pass. Merge only with explicit authorization;
- manter snapshots diários e acumular histórico confiável;
- melhorar frescor/valuation de renda fixa e registrar as-of real (V263 em review);
- amadurecer dashboard e detalhes de renda fixa;
- manter cobertura pública de eventos e Import Center.

## DEBT (2026-09-25, V263 run)

- V262 SGS IPCA fetcher sends `dataInicial=MM/YYYY`; the BCB endpoint returned HTTP 400 `Invalid initial date` on both V262 base and V263. This predates V263 and needs a separately scoped source/date-contract fix; do not infer fresh IPCA data from a failed request.
- `tests/local-http-server.js`: `writeHead(200)` antes do `readFile` gera `ERR_HTTP_HEADERS_SENT` em 404 (debt de harness; não falhou depois de `build:modern` existir).
- Worktree nova exige `npm run build:modern` antes de `npm test` (smokes de browser requisitam `modern/dist/assets/*`).

- The previously reported page-level 1886px overflow was not reproducible using the valid built-app Vite preview on either V262 or V263; the dense desktop table is internally scrollable. Treat the earlier unstyled screenshot/overflow as invalid harness evidence, not current product debt.

## NEXT CANDIDATE (readiness only)

- V264 BCB SGS IPCA request-contract hardening: validate the official date format before changing the existing month-only `dataInicial` serialization. Preserve IPCA+ `UNSUPPORTED_IPCA_EXACT`, manual Renda Fixa authority, and no-fabricated-data behavior. No phase has been authorized or started.

## BLOCKED_BY_USER_INPUT

- fixture sanitizada de nota XP;
- fixture sanitizada de nota BTG.

## LATER

- TWR/XIRR histórico após dados suficientes;
- cobertura oficial FII/FIAGRO mais ampla;
- avaliação futura de MODE_B, sem ativação automática.
