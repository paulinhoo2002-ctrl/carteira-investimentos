# AUTH-DEMO Phase 2 — Security rules model, attack matrix e emulator (estado)

Missão: `LEGACY_MULTIUSER_AUTH_DEMO_PHASE2_SECURITY_BOOT_AND_UI` (fases P0-P5 recebidas).
Branch: `codex/legacy-auth-demo` (base `634c6fd` + commits locais desta fase).
Modo: EMULATOR_FIRST, FAIL_CLOSED, ZERO_COST, sem migração de dados financeiros reais.

## Regras de segurança (firestore.auth-demo.rules) — P2/P3

Modelo emulator-ready para o storage UID-scoped futuro. NÃO é o `firestore.rules` de produção
(`PRODUCTION_RULES_DEPLOY=0`); o arquivo de produção não foi tocado.

- `authorizedUsers/{uid}`: registro de autorização = verdade do servidor
  (`uid`, `normalizedEmail`, `enabled`, `blocked`, `role` ∈ owner|user|viewer|admin).
  - Leitura: somente o próprio usuário autenticado (arquitetura resolve o modo a partir dele).
  - Escrita: `if false` — cliente NUNCA muta (sem self-escalation); somente Admin SDK (trusted path).
- `portfolios/{userId}` e `users/{userId}`: leitura/escrita somente com
  `isRealAuthorizedOwner(userId)` = autenticado + `email_verified` + uid == path +
  registro existente com role válida + `enabled == true` + `blocked == false`
  (espelho exato do `resolveAccountMode` da Fase 1).
- Fail-closed: registro ausente/malformado => DENY. Spoof client-side de `accountMode`
  não existe para as regras — só o registro conta.

## Matriz de ataque (tests/auth-demo-security.test.js) — P4/P5

Rodar: `npm run test:auth-demo-emulator`
(emulators:exec; config `firebase.auth-demo-emulator.json`; projeto `demo-auth-demo-phase2`;
ports 9099/8080/4400/4500; zero custo; localhost only).

- T01/T02: não autenticado lê/escreve => DENIED
- T03/T04: DEMO (enabled=false) lê/escreve real => DENIED
- T05/T06: REAL A lê/escreve de B => DENIED
- T07/T08: REAL lê/escreve próprio escopo => ALLOWED (com prova do claim `email_verified`)
- T09/T10: BLOCKED lê/escreve => DENIED
- T11: qualquer mutação de registro (5 tentativas + delete) => DENIED
- T12: spoof de modo + não verificado com registro autorizado => DENIED
- T13: leitura cruzada de registro => DENIED
- T14: verificado sem registro => DENIED (fail-closed)
- T15: leitura do próprio registro OK + registro × `resolveAccountMode` consistente
- T16: role inválida => DENIED (resolver => DEMO)

Usuários sintéticos (P5): OWNER_REAL, USER_REAL, USER_DEMO, USER_BLOCKED,
USER_UNVERIFIED (+ USER_NOREGISTRY, USER_BADROLE). E-mails `@auth-demo.test`, senhas
por-run, nada real.

`SECURITY_ATTACK_MATRIX=100% PASS` (16/16, SUITE_EXIT=0).

## Lição de emulador (não repetir)

`accounts:update` com `{emailVerified:true}` é NO-OP silencioso no Auth Emulator.
Fluxo que funciona: `accounts:sendOobCode(VERIFY_EMAIL)` → ler o código em
`GET /emulator/v1/projects/{pid}/oobCodes` → `accounts:update {oobCode}` → fresh
signIn minta `email_verified=true`. Além disso: token mintado ANTES da verificação
carrega claim antigo (re-signIn obrigatório) e `await res.text()` dentro de template
de assert consome o body (ler uma vez só).

## Estado e limites

- GATES no HEAD da fase: attack matrix 16/16; Fase 1 `tests/auth-account-mode.test.js` 30/30;
  `node --check` OK; `git diff --check` OK.
- Órfãos java pós-ciclo: 4 limpos com verificação de identidade (jar+projeto+worktree+parent morto).
- NÃO feito (fora do brief recebido, que foi truncado após P5): integração boot/UI
  (`index.html`), deploy de regras, migração financeira, PR/push.
- Dados financeiros reais de produção: intocados (`HOSTED_FINANCIAL_WRITES=0`).
