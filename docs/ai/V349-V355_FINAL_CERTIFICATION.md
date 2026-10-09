# V349–V355 — Finalização e certificação (2026-10-09)

Branch `codex/v348-dashboard-highlights` (PR #465), HEAD `8563743`, CI 5/5
(run `37920792435`), Vercel Preview READY.

## V349 — contrato de estados de renda (commit `1b935a4`)

Auditoria do pipeline de recebidos: contrato correto; falso alarme registrado
(manual sem estado = PAID por default de domínio — registrar provento é a
confirmação do recebimento). Pinned em `tests/v349-income-state-contract.test.js`
(3/3): ANNOUNCED/DECLARED/EXPECTED/ESTIMATED/PROJECTED/UNKNOWN/PENDING/CANCELLED
nunca viram PAID; os três consumidores de recebidos roteiam pelo filtro
classifyIncomeState==='PAID'.

## V350 — auditoria do preço médio (commit `8563743`) — SEM DEFEITO

`syncAssetsFromAportes` extraído em VM sandbox (`tests/v350-avg-price-audit.test.js`,
6/6): média ponderada correta em compras múltiplas; venda parcial reduz o custo
total proporcionalmente e **preserva o custo unitário remanescente**; venda
total remove a posição e recompra inicia base nova; mesma data segue ordem de
inserção e over-sell faz clamp na quantidade disponível; compra sem preço
contribui quantidade com custo zero (comportamento legado documentado, sem
invenção de custo); posição importada sem aportes não ganha custo fictício.
Nenhuma fórmula alterada — ausência de defeito é evidência, não gatilho de mudança.

## V351 — Firebase/emuladores: BLOCKED_ENVIRONMENT local, coberto no CI

`v311-auth-emulator` falha local por ECONNREFUSED 127.0.0.1:8080 (Firestore
Emulator não instalado; falha idêntica no main puro — pré-existente). O check
**Auth and Firestore emulator QA do CI é PASS** no SHA `8563743` (Ubuntu/Java 21).
Estado NOT_TESTED localmente para sessão de provedor real; registrado como
limitação, não como PASS local.

## V352 — backups: suítes sintéticas verdes; policy-script bloqueado por ambiente

Backup/restore/recovery/hardening: 41/41 PASS. `backup-security-policy` exige
o backup-root aprovado `C:\Projetos\_backups\carteira-investimentos` (inexistente
na máquina; mesma falha no main puro) — BLOCKED_ENVIRONMENT; criar o diretório
é infra local do usuário, fora do escopo autorizado. Nenhuma importação ou
restauração real executada.

## V353 — acessibilidade e responsividade: 45/45 PASS

V289 completo (axe dark/light, teclado, toque, reduced-motion, 16 testes) +
V346 (gaps 320–3440 + zoom 125/150/200%) + mobile-overflow + touch-targets +
tablet-tab-overflow + safe-area. **Somente Chrome certificado**; Firefox/WebKit
não instalados (executável ausente) — limitação registrada.

## V354 — revisão independente: sem achado novo

Diff da branch contra main: 30 linhas de produto (painel + memo + clear no
render), 324 linhas de testes. Zero fórmulas financeiras alteradas. Confirmado
que `S._dashboardHighlightsCache` nunca é serializado (buildStoredState usa
allowlist). Nenhum bypass de autenticação; smoke migrado não enfraqueceu
invariante (RECEBIDO agora com doesNotMatch explícito contra estimativa/futuro).
Revisão cruzada por segundo modelo: não disponível neste runtime — limitação
declarada.

## V355 — certificação no SHA `8563743`

- `npm test` 867/867 (12 suítes, 0 fail) · `test:modern` 823/823
- `verify:release` EXIT=0 (15 suítes fail 0) · `qa:all` PASS (OVERFLOW/CONSOLE/PAGE/REQUEST=0)
- V289 16/16 · V343-clarity 4/4 · V348 6/6 · V349 3/3 · V350 6/6 · A11Y/responsivo 45/45
- Builds legacy/moderno PASS · `git diff --check` PASS
- CI 5/5 (run `37920792435`) · Vercel Preview READY

Classificação:
- BLOCKER=0 · MAJOR=0
- MINOR=1 (herdado): taxas informadas com parse inválido não alertam no preview em tempo real (validação bloqueia no save)
- DEFERRED: sessão autenticada de provedor e navegadores Firefox/WebKit (ambiente local); backup-root aprovado local
- PRODUCTION_READY=false — aguarda: revisão humana das PRs #463/#464/#465, merge autorizado e gates de produção

## Flags

`REAL_WRITES=0` · `REAL_IMPORT=false` · `REAL_RESTORE=false` · `PRODUCTION=false` · `MERGE=false`
