# Trabalho aberto

## NOW

- V264 BCB SGS request-contract hardening is in PR #415, OPEN. CI and Vercel passed on the implementation head; use live PR checks for the documentation follow-up. Do not merge without explicit authorization.
- manter snapshots diários e acumular histórico confiável;
- V263 financial/source as-of provenance is merged; preserve its semantics as BCB SGS retrieval is hardened in V264;
- amadurecer dashboard e detalhes de renda fixa;
- manter cobertura pública de eventos e Import Center.

## RESOLVED BY V264 (2026-09-25)

- SGS 433 month bounds now use validated inclusive `DD/MM/YYYY` dates. Explicit provider `Value(s) not found` is no-data, not zero; other HTTP failures remain errors. A temporary 502 occurred on a live September-only probe, so do not claim every current-month provider request succeeds.

## DEBT (2026-09-25)

- `tests/local-http-server.js`: `writeHead(200)` antes do `readFile` gera `ERR_HTTP_HEADERS_SENT` em 404 (debt de harness; não falhou depois de `build:modern` existir).
- Worktree nova exige `npm run build:modern` antes de `npm test` (smokes de browser requisitam `modern/dist/assets/*`).

- The previously reported page-level 1886px overflow was not reproducible using the valid built-app Vite preview on either V262 or V263; the dense desktop table is internally scrollable. Treat the earlier unstyled screenshot/overflow as invalid harness evidence, not current product debt.

## NEXT CANDIDATE (readiness only)

- After V264 merge/release, prepare fixture-backed Import Center hardening. Sanitized XP/BTG notes are required; do not invent fixtures or enable unsupported imports without them. V93 report intelligence is already present on main, so do not duplicate that phase.

## BLOCKED_BY_USER_INPUT

- fixture sanitizada de nota XP;
- fixture sanitizada de nota BTG.

## LATER

- TWR/XIRR histórico após dados suficientes;
- cobertura oficial FII/FIAGRO mais ampla;
- avaliação futura de MODE_B, sem ativação automática.
