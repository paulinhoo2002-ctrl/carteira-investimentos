# AUTH-DEMO Phase 2 — Boot security, realtime, e contrato de migração (P6-P35)

Missão: `LEGACY_MULTIUSER_AUTH_DEMO_PHASE2_SECURITY_BOOT_AND_UI` (P6-P37).
Branch: `codex/legacy-auth-demo` (base `634c6fd`; segurança P0-P5 em `14fbeab`).
Estado deste documento: módulos certificados; integração `index.html` + QA browser pendentes (ver Blockers).

## Boot security order (P6) — `auth/boot.js`

`runBoot(deps)` executa a ordem EXATA (assert nos testes, `tests/auth-boot.test.js`):
`INIT_FIREBASE → RESOLVE_AUTH → SHOW_LOADING → INSPECT_EMAIL_VERIFIED → LOAD_AUTHORIZATION → RESOLVE_ACCOUNT_MODE → SELECT_DATA_SOURCE → LOAD_PORTFOLIO → RENDER`.

- `REAL_DATA_FETCH_BEFORE_AUTHORIZATION=0` provado: `loadPortfolio` só existe após modo+fonte resolvidos; nunca chamado em BLOCKED/LOGIN_REQUIRED.
- Fail-closed: REAL sem UID → `BOOT_FAIL_CLOSED`; sem registro → DEMO (nunca REAL); malformado → BLOCKED.
- Revocação/flash: `clearRealCache` é chamado ANTES do render em qualquer modo ≠ REAL — estado real em cache nunca sobrevive a uma sessão DEMO/BLOCKED/LOGIN (P25/P27 módulo-nível).
- DEMO→REAL (P26): boot REAL nunca constrói/lee a fonte demo — dados demo não são migrados nem copiados.
- P32: em DEMO, `createRealSource` não é chamado — `DEMO_FIRESTORE_READS=0`, `DEMO_FIRESTORE_WRITES=0` (estrutural; regras negam no servidor — T03/T04).

## Routing (P8-P11) — `auth/boot-ui.js` + data-source guard (P18)

- Loading: "Verificando sua conta..." (`role="status"`, `aria-live="polite"`, zero valores).
- Login: "Continuar com Google" sempre; "Entrar com e-mail" SOMENTE se o host provar provedor configurado (`emailAuthConfigured: true`) — nunca inventar provider.
- BLOCKED: "Acesso indisponível" — sem valores, sem jargão, sem auto-DEMO.
- Badge demo: "Modo demonstração" + "Dados fictícios" persistente; reset "Restaurar demonstração" com confirmação.
- P18: `createFirestoreRealDataSource(uid, db, {accountMode})` lança `ACCOUNT_MODE=REAL (fail closed)` em DEMO/BLOCKED/LOGIN_REQUIRED — fonte real não pode ser construída fora do REAL.

## Realtime/isolamento (P19/P20) — classificação honesta

- Firestore emulator NÃO implementa `documents:listen` REST (HTTP 404 com token válido) e não há SDK firebase em node_modules (60 pkgs; nova dependência exige aprovação) — sem como certificar push `onSnapshot` neste worktree.
- `SAME_UID_REALTIME_SYNC=PARTIAL_REST_DATA_PARITY`: dois dispositivos (2 sessões) mesmo UID REAL — cada um escreve e OBSERVA a escrita do outro (REST) — provado em `tests/auth-demo-realtime.test.js`. Gap exato: semântica de PUSH (listener) requer teste com SDK.
- `CROSS_USER_ISOLATION=PASS_READ_LEVEL`: B→A leitura/escrita negadas (403) e A íntegro; `onSnapshot` é autorizado pela MESMA regra `allow read` (negação rule-identical), mas a negação no nível listen/wire não foi testável (endpoint ausente).

## Escrita concorrente (P21/P22) — modelo e decisão

- Auditoria: `FirestoreRealDataSource.save` usa `set(data, {merge:true})` (Fase 1) = merge a nível de CAMPO, não replace integral. Equivalente REST: `PATCH?updateMask.fieldPaths=...` — provado no emulador: A grava campo X, B grava campo Y, ambos sobrevivem + campos pré-existentes preservados (P21 PASS).
- Risco documentado: merge:true substitui SUBMAPAS do campo gravado (não faz merge profundo) — mutações concorrentes no MESMO campo estrutural são last-write-wins por campo.
- P22 DECISÃO: NÃO adicionar contador de revisão agora (complexidade sem ganho material — conflitos reais são por campo e o merge já os escopa; `updatedAt` continua sendo responsabilidade do payload do host). Reavaliar se aparecer perda real.

## Offline/reconnect (P23)

`OFFLINE_CONFLICT_MODEL=DESIGNED_ONLY` — política declarada: escritas são merge por campo (last-write-wins por campo após reconexão); NENHUMA resolução custom de conflito implementada; offline queue é comportamento do SDK no app real. Não reivindicar resolução perfeita.

## Settings (P24) — `SETTINGS_SYNC_POLICY` (`auth/boot.js`)

- SYNC_ACCOUNT: theme, currency, locale, goals, divGoal, dashboardPeriod, rentabilidadeBenchmark.
- DEVICE_LOCAL: selectedTab, openModal, temporaryUiState, scrollPosition, browserCacheFlags.
- Fail-closed: chave não classificada → `UNCLASSIFIED_DO_NOT_SYNC` (nunca sincar por padrão).

## Privacidade demo (P31) — guardas estendidas em `assertDemoSafety`

Além de UID real/tickers/valores (Fase 1), agora rejeita: `movimentacao-2026*`, `posicao-2026*`, `PosicaoDetalhada`, `package1_v2`, `package2_v2`, projeto de produção `carteira-de-investimento-16725`, `_backups`, `.qa-state`. Testado positivo (fixture ok) e negativo (injeções rejeitadas).

## Portas do emulador auth-demo

Migrado para portas PRIVADAS (auth 9100, firestore 8085, hub 4401, logging 4501) em `firebase.auth-demo-emulator.json` + ambos os arquivos de teste. Motivo: colisão recorrente na 8080 — incluindo um órfão java DE OUTRO PROJETO (carteira-2.0-multiuser, `demo-carteira-2-0`, PID 5916, parent morto) que NÃO foi tocado (missão proíbe). Portas privadas eliminam a classe de conflito.

## Compatibilidade de produção (P34) e plano de migração Phase 3 (P35)

Produção INTACTA: `firestore.rules` não modificado; `portfolios/{uid}`/Package1A/Package2 não migrados; zero escritas hospedadas.

Plano exato (execução futura, human-gated):
1. Backup canônico do doc `portfolios/{ownerUid}` (export JSON local, SHA-256 registrado).
2. `source_doc_hash` (hash canônico recursivo — ordem de chaves NÃO-determinística no REST: usar canonicalize).
3. Caminho alvo: `users/{uid}/portfolio` (modelo final escolhido) — ou manter `portfolios/{uid}` e só adicionar `authorizedUsers` (decisão de produto; o modelo de regras auth-demo suporta ambos).
4. Preservação campo a campo: package1_v2 e package2_v2 copiados byte-identicos; campos não relacionados nunca reescritos.
5. Idempotência: NOOP_IF_EXACT_MATCH (hash de conteúdo igual → skip); INSERT_IF_ABSENT; ABORT_IF_CONFLICT (padrão do writer Package2).
6. Readback pós-cópia: GET + re-hash == source hash; UNRELATED_FIELDS_CHANGED=0.
7. Rollback: remover APENAS o campo/doc criado pela migração (hash do campo próprio, nunca updateTime do doc inteiro — preserva mutações estranhas posteriores).
8. Cutover: (a) regras novas deployadas (gated), (b) adapter READ de compatibilidade ativo, (c) cópia idempotente, (d) readback, (e) switch de leitura do app, (f) escrita dual nunca — single-writer.
9. Adapter de compatibilidade (P31/34): `readPortfolioCompat(uid)` tenta `users/{uid}/portfolio`, fallback `portfolios/{uid}` — READ-only, sem mutação em produção.

## Gates verificados neste HEAD (worktree legacy-auth-demo)

- `npm run test:auth-demo-emulator`: 20/20 (matriz 16 + realtime 4), SUITE_EXIT=0
- `tests/auth-boot.test.js` + `tests/auth-account-mode.test.js`: 51/51
- `npm run test:finance`: 96/96; `test:persistence`: 32/32; `test:ir2026`: 71/71
- `node --check`: OK em todos os arquivos novos/alterados

## Wiring index.html — CONCLUÍDO (sessão de boot/UI)

Boot seguro integrado ao caminho REAL do app (não módulo isolado): 5 módulos auth
carregados antes do app; decisão ÚNICA de modo em onAuthStateChanged (sessão
offline protegida V250 preservada antes do roteamento); compat adapter
registry → meta/access → admin allowlist (owner continua carregando normally);
DEMO hidrata pela rota canônica (normalizeWalletEntry + syncStateFromWallet);
BLOCKED renderiza tela dedicada (AuthBootUi); logout limpa S em memória
(REAL_DATA_FLASH pós-logout); guards accountMode em
startCloudSync/queueCloudSave/uploadLocalToCloud (DEMO_MODE_NO_CLOUD_WRITES);
gate loading "Verificando sua conta..."; badge "Modo demonstração · Dados
fictícios" + Restaurar no authBox; sw.js APP_SHELL inclui os 5 módulos.
Certificações: auth-demo-wiring 12/12; inline-syntax OK; e2e-auth-mode e
local-synthetic-qa-runtime preservados; v201/v250b/v284 94/94; emulador 20/20.

## Browser certification — CONCLUÍDO (sessão final)

`npm run test:auth-demo-browser` 9/9 PASS (Chromium real, server local dedicado,
lifecycle determinístico): LOGIN gate sem valores; AUTH_LOADING
"Verificando sua conta..." com role=status/aria-live (adicionado ao gate);
DEMO 7 rotas renderizadas com badge visível + IRPF 100% sintético
(generateDemoIrpfState, sem "0 de 61"/bloqueios do owner); Restaurar demonstração
reseta fixture exata (9 ativos) sem requests; persistência demo = memória/sessão
(reload volta ao gate — modelo honesto); BLOCKED dedicado; no-flash no boot;
responsivo 390/768/1366/1920 × claro/escuro GLOBAL_OVERFLOW=0 (40 combos);
Axe (local axe-core) critical=0/serious=0 em 10 combos. Defeito real encontrado
e corrigido: badge vivia em .hdr-right display:none → overlay fixo
`#auth-demo-badge` sincronizado no render() (visível em todas as rotas,
removido fora do DEMO). Screenshots privados: .qa-state/auth-demo-browser/.

## Bateria pesada final (HEAD c19184d) — PASS COMPLETO

`npm ci --ignore-scripts` (0 vulns) → `npm test` EXIT=0 (cadeia completa:
v324-backup, finance 96/96, persistence 32/32, backup-restore, load, roundtrip,
extraction, ui, performance, readonly-contract, v330, local-synthetic);
`test:modern` 823/823; `qa:all` EXIT=0 (build + vite build:modern +
qa-harness + smoke: OVERFLOW=0, CONSOLE_ERRORS=0, PAGE_ERRORS=0,
REQUEST_ERRORS_RELEVANT=0); `test:visual-regression` 18/18; emulador auth-demo
20/20; browser certification 9/9; wiring/boot/account-mode fail 0.
Nota ambiental: primeiro run de `npm test` falhou em test:v324-backup por
root de backup aprovado ausente — `C:\Projetos\_backups\carteira-investimentos`
recriado (diretório vazio aprovado; nada pré-existente foi tocado).

## AUTH_DEMO_PHASE2_READY=YES (P26)

Todos os critérios do gate atendidos; única exceção documentada (permitida):
SAME_UID_REALTIME_SYNC_BROWSER=BLOCKED_BY_HARNESS (app conecta emulador nas
portas 8080/9099; 8080 ocupada por órfão do projeto carteira-2.0 — intocado),
com REST same-UID + isolamento em emulador permanecendo certificados.

## Phase 3 preflight (planejamento apenas — NÃO executado nesta missão)

1. Humano decide destino do órfão 8080 (carteira-2.0, PID 5916) → libera
   emulador browser full-flow para certificação onSnapshot push.
2. Deploy das regras `firestore.auth-demo.rules` para produção (gate humano;
   hoje PRODUCTION_RULES_DEPLOY=0) com revisão de impacto no owner.
3. Bootstrap do registro em produção: `authorizedUsers/{ownerUid}`
   {enabled:true, role:'owner', blocked:false} via Admin SDK (trusted path)
   ANTES do cutover das regras — garante owner REAL via registro.
4. Validação do owner em produção pós-deploy (login, portfolio, Package1A/2
   intactos) — sem migração de dados.
5. Somente então: execução do plano de migração P35 (backup → hash canônico →
   cópia idempotente → readback → rollback por hash de campo → cutover).
6. Certificação same-UID device-a-device (browser) e revogação em produção
   controlada (sandbox primeiro).
