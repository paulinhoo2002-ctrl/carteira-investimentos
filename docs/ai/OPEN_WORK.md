# Trabalho aberto

## NOW

- V264 BCB SGS request-contract hardening is merged to `main` as `10995f31d7ada0b7f8a02e6317813de0c21fc55d` (PR #415).
- V265 QA harness resilience is in PR #416 on `feature/v265-qa-harness-resilience`; verify final exact-head CI/preview before declaring readiness. Do not merge without explicit authorization.
- manter snapshots diários e acumular histórico confiável;
- V263 financial/source as-of provenance is merged; preserve its semantics as BCB SGS retrieval is hardened in V264;
- amadurecer dashboard e detalhes de renda fixa;
- manter cobertura pública de eventos e Import Center.

## RESOLVED BY V264 (2026-09-25)

- SGS 433 month bounds now use validated inclusive `DD/MM/YYYY` dates. Explicit provider `Value(s) not found` is no-data, not zero; other HTTP failures remain errors. A temporary 502 occurred on a live September-only probe, so do not claim every current-month provider request succeeds.

## RESOLVED BY V265 (2026-09-25)

- `tests/local-http-server.js` now reads before writing success headers; a missing generated asset returns 404 and the server remains alive.
- QA server scripts use the isolated Node static server on loopback; `qa:all` builds modern assets and runs the server contract test before smoke.

- The previously reported page-level 1886px overflow was not reproducible using the valid built-app Vite preview on either V262 or V263; the dense desktop table is internally scrollable. Treat the earlier unstyled screenshot/overflow as invalid harness evidence, not current product debt.

## NEXT CANDIDATE (readiness only)

- Fixture-backed XP/BTG Import Center validation after the user supplies representative sanitized brokerage notes. V93 report intelligence and the old clean-state integration branch have no unique delta against current main; do not duplicate them.

## BLOCKED_BY_USER_INPUT

- fixture sanitizada de nota XP;
- fixture sanitizada de nota BTG.

## LATER

- TWR/XIRR histórico após dados suficientes;
- cobertura oficial FII/FIAGRO mais ampla;
- avaliação futura de MODE_B, sem ativação automática.
