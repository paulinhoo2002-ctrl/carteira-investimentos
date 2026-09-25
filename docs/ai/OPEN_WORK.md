# Trabalho aberto

## NOW

- V264 BCB SGS request-contract hardening is in progress on `feature/v264-bcb-sgs-request-contract-hardening`, based on V263 merge `346ae421222f5f167d7ad2ce2c62cd7ed2639e41`. Local tests/builds are green; verify exact-head CI and Vercel preview after publishing. Do not merge without explicit authorization.
- manter snapshots diários e acumular histórico confiável;
- melhorar frescor/valuation de renda fixa e registrar as-of real (V263 em review);
- amadurecer dashboard e detalhes de renda fixa;
- manter cobertura pública de eventos e Import Center.

## RESOLVED BY V264 (2026-09-25)

- SGS 433 month bounds now use validated inclusive `DD/MM/YYYY` dates. Explicit provider `Value(s) not found` is no-data, not zero; other HTTP failures remain errors. A temporary 502 occurred on a live September-only probe, so do not claim every current-month provider request succeeds.

## DEBT (2026-09-25)

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
