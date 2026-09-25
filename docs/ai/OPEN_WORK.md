# Trabalho aberto

## NOW

- revisão independente e QA autenticado do PR #413 (V263 as-of provenance); merge somente com autorização explícita;
- manter snapshots diários e acumular histórico confiável;
- melhorar frescor/valuation de renda fixa e registrar as-of real (V263 em review);
- amadurecer dashboard e detalhes de renda fixa;
- manter cobertura pública de eventos e Import Center.

## DEBT (2026-09-25, V263 run)

- Modern host shell: overflow horizontal de página com a tabela RF densa de 24 colunas (pre-existente no build V262; wrapper da tabela é scrollável por design; telas legadas certificadas não afetadas).
- `tests/local-http-server.js`: `writeHead(200)` antes do `readFile` gera `ERR_HTTP_HEADERS_SENT` em 404 (debt de harness; não falhou depois de `build:modern` existir).
- Worktree nova exige `npm run build:modern` antes de `npm test` (smokes de browser requisitam `modern/dist/assets/*`).

## BLOCKED_BY_USER_INPUT

- fixture sanitizada de nota XP;
- fixture sanitizada de nota BTG.

## LATER

- TWR/XIRR histórico após dados suficientes;
- cobertura oficial FII/FIAGRO mais ampla;
- avaliação futura de MODE_B, sem ativação automática.
