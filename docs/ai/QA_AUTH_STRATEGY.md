# Synthetic QA authentication and route smoke

## V316 active Preview contract

V316 seleciona projeto Firebase QA apenas em Preview autorizado; sem QA completo,
bloqueia login. `firebase.qa-preview.rules` e o documento `meta/access` sintético
são necessários no projeto QA porque as regras de produção permitem ler esse
documento apenas ao administrador de produção. O handoff operacional atual é
[`V316_PROVIDER_QA_HANDOFF.md`](V316_PROVIDER_QA_HANDOFF.md). O smoke público
aceita `https://HOST/ QA_PROJECT_ID`; autenticação Google real ainda não foi
executada. As seções V315/V310 abaixo descrevem estados históricos.

## V315 status — Layer 3 operacional e scaffolding Layer 4

PR #439 integrou Auth + Firestore emulators e CI Ubuntu. O estado atual da
Layer 3 está certificado no merge `2966dfb197ddcde5440379f8d2d21c35cdeda183`;
ver `docs/ai/PROJECT_STATE.md` para gates e deployment pós-merge. Os blocos
V310 abaixo registram corretamente o estado histórico daquela versão.

O follow-up V315 adiciona `scripts/qa/preview-firebase-config.cjs`,
`scripts/qa/preview-provider-smoke.cjs` e `tests/qa-preview-firebase-config.test.js`.
O contrato requer `VERCEL_ENV=preview`, `VERCEL_URL` exatamente listado em
`QA_FIREBASE_PREVIEW_ALLOWED_HOSTS`, as seis variáveis `QA_FIREBASE_*` de
configuração cliente e `PRODUCTION_FIREBASE_PROJECT_ID` diferente de
`QA_FIREBASE_PROJECT_ID`. A allowlist é controle de host, não segredo.

`npm run test:qa-preview-config` usa somente dados sintéticos e roda na CI. O
`npm run qa:preview-provider-smoke` é uma verificação de fronteira somente de
leitura: baixa a página pública do Preview, extrai o project ID inline e exige
igualdade com o ID QA configurado e diferença do ID de produção. Ele não executa
login Google, não usa credenciais e não faz writes. A aplicação ainda não
seleciona essa configuração; sem uma futura alteração revisada do runtime, o
smoke bloqueia corretamente. Não configurar variáveis em Preview antes dessa
alteração e dos testes negativos de seleção de ambiente.

`QA_FIREBASE_PROJECT_EXISTS=NOT_VERIFIED`: nenhuma configuração Preview QA foi
encontrada nos metadados consultáveis, o que não prova inexistência de projeto
Firebase externo. A pessoa responsável deve provisionar projeto/Auth/Firestore
isolados, identidade sintética e domínio Preview; nunca enviar valores de
configuração ou credenciais no chat. A ativação da config no runtime é uma
missão posterior separada.

## Three distinct kinds of evidence

- `PRODUCTION_PUBLIC_GATE_SMOKE` checks reachability, the public login shell and
  an explicit build identifier when the deployment exposes one. It does not
  inspect authenticated portfolio routes.
- `AUTHENTICATED_SYNTHETIC_QA_SMOKE` checks authenticated-route composition with
  the repository's localhost-only deterministic `testMode` fixture. This mode
  does not authenticate with Firebase, initialize Firebase, or represent an
  authenticated identity. It proves route rendering and navigation only.
- `REAL_USER_ACCEPTANCE_TEST` is optional and manual. It must use the normal
  authentication flow, the user's consent, and a strictly read-only procedure.
  It must never be automated with private financial data.

## Existing repository boundary

The production path continues to use Firebase Authentication and the Google
sign-in flow. Firebase owns auth session persistence (the app requests Firebase
`LOCAL` persistence when available); application code does not copy auth tokens
or session cookies into its own storage. The local deterministic fixture is
enabled only on `localhost` or `127.0.0.1` with the explicit `testMode=1` flag.
In that local mode, it bypasses the access gate, does not initialize Firebase,
uses in-memory synthetic state, and blocks import/export actions. The
`tests/e2e-auth-mode.test.js`
contract protects these boundaries.

Repository inspection found no configured Firebase Auth Emulator, isolated QA
Firebase project, or dedicated synthetic test account. Do not add a production
auth bypass, query-parameter shortcut, hardcoded credential, shared QA secret,
or client-created user accepted by a real backend. A true provider-authenticated
smoke requires a separately provisioned isolated QA project/account and
environment configuration. Until then, route coverage must be described as
synthetic local route smoke, not authenticated-provider verification.

The static production Firebase configuration is embedded in the legacy page;
no preview-specific Firebase project selection was found. Therefore a preview
deployment is not an isolated auth environment and must not be used for a
synthetic authenticated smoke until a separate configuration boundary is
designed and verified.

## Automated local route smoke

`npm run test:visual-regression` runs the V289 route/theme/viewport matrix with
the local deterministic fixture. It checks route rendering, navigation,
responsive overflow/clipping, accessibility, reduced motion, page/console
errors, Firebase initialization/network contact, and financial storage writes.
The fixture uses synthetic data only. The app may write nonfinancial local QA
metadata (`civ5_edit_lock` and the synthetic V258 monitoring baseline); these
are not financial persistence. The harness explicitly rejects writes to the
`civ5` financial storage key and requests to Firebase endpoints.

Coverage is browser based and read-only: Dashboard, Ativos, Dividendos, Renda
Fixa, Confiabilidade and other direct routes are visited at 390x844 and
1366x768 in dark and light themes; representative routes also cover 430, 768,
1440, 1536 and 1920 widths. Browser/Chromium must be installed or provided via
`CHROME_PATH`.

## Release gates

`npm run verify:release` composes offline/local gates:

- `npm test`
- `npm run test:modern`
- `npm run qa:all`
- `npm run test:visual-regression`

The visual step requires Chromium. `npm run test:import-xlsx` remains a separate
network-dependent manual release gate because production SheetJS is loaded via
CDN/SRI. Do not silently fold it into offline CI. The import test must continue
to use synthetic XLSX bytes only.

## Safety statements

The local synthetic route smoke does not contact production Firebase and does
not prove Firebase/Google authentication behavior. It must not trigger import,
save, transaction, tax, goal update, or other financial mutation actions.
Production authentication configuration and secrets are outside this QA
strategy and are not changed by it.

## V310 architecture decision: isolate every Firebase service

`AUTH_PROVIDER=Firebase Authentication / Google popup` in the normal app.
The legacy `index.html` loads Firebase compat SDK 10.12.5 from gstatic, embeds
the production Firebase client configuration, calls `firebase.initializeApp`,
then creates Auth and Firestore clients. `onAuthStateChanged` validates the user
against Firestore `meta/access`, records an access attempt, and starts cloud
sync only after authorization. Firebase `LOCAL` persistence owns the session.
The localhost `testMode=1` branch returns before Firebase initialization,
supplies an in-memory fixture and does not test provider authentication.
There is no repository configuration for Auth or Firestore emulators, no local
Firebase CLI, no isolated QA/Preview project, and no synthetic provider account.

**Decision:** retain the existing local synthetic route smoke as layer 2.
For layer 3, use a `demo-` Firebase project with **both** Auth and Firestore
emulators and a test-only, loopback-bound app configuration. Auth alone is
unsafe here: access control reads Firestore and records login attempts. A real
project ID with only Auth emulated could still contact live Firestore. The
emulator path must fail closed if either emulator is absent, the host is not
loopback, the demo project ID mismatches, or any Firebase request targets a
production endpoint. Seed only synthetic `meta/access` authorization in the
ephemeral Firestore emulator; never treat the app's production admin fallback
as a QA account. Keep synthetic identities and all state ephemeral. Access-log
writes may occur only inside that emulator and must be distinguished from
financial writes.

The local emulator integration is **not implemented in V310**. The current
static page hardcodes the production Firebase configuration; connecting only
Auth, or injecting a query parameter into the product auth guard, would create
an unsafe mixed environment. The Firebase CLI is also not installed in the
verified runtime. Implement layer 3 in a separate reviewed test-harness change
that supplies a demo-only config before Firebase initialization and connects
both compat SDK clients before listeners or reads. The test must prove no
production Firebase contact and zero financial/import/tax writes. Do not call
the existing testMode smoke an emulator smoke.

For layer 4, provision a **separate** Firebase QA project and Auth user store,
plus a separate Firestore database and rules. Preview deployments may use that
project only after a reviewed environment-selection mechanism is added to the
static legacy build. The current page does not read Vercel environment
variables; setting them today would not isolate anything. Proposed Preview-only
configuration keys correspond to the current client fields:
`QA_FIREBASE_API_KEY`, `QA_FIREBASE_AUTH_DOMAIN`, `QA_FIREBASE_PROJECT_ID`,
`QA_FIREBASE_STORAGE_BUCKET`, `QA_FIREBASE_MESSAGING_SENDER_ID`, and
`QA_FIREBASE_APP_ID` (plus `QA_FIREBASE_MEASUREMENT_ID` only if analytics is
deliberately used). These names are a design contract, **not** active settings.
Do not store their values in Git or chat. Production keeps its current config;
unknown or missing Preview config must fail closed, never fall back to
production. No Vercel setting or Firebase resource was changed in V310.

| Layer | Environment | What it proves | Current status |
| --- | --- | --- | --- |
| 1 Public production gate | Production login shell | Reachability, public auth gate, exposed build identity | Available; no private route claim |
| 2 Local synthetic route | Loopback `testMode=1`, in-memory fixture | Route composition, navigation and read-only visual behavior | Available; no Firebase identity |
| 3 Local Auth + Firestore emulators | Loopback, `demo-` project, ephemeral synthetic user | SDK auth state plus local access-control interaction | Designed; not implemented |
| 4 Provider-authenticated Preview | Isolated QA Firebase project and Preview domain | Real Google provider flow in a non-production environment | Deferred; human provisioning required |

Layer 3 does not prove Google's live OAuth service; layer 2 does not prove any
Firebase authentication. Real-user acceptance is separate, optional and manual.

## Threats and required controls

| Threat | Required mitigation |
| --- | --- |
| Production auth bypass or query-parameter login | No product auth-guard shortcut; emulator mode is test-only, loopback-bound and cannot run on deployed origins. |
| Production Firestore write from an emulated identity | Use a `demo-` project and connect **both** Auth and Firestore emulators before any read/write; fail closed on missing service. |
| QA credential, OAuth token or session leak | Ephemeral synthetic identities; no password/token/cookie in Git, logs, artifacts or chat. |
| Preview silently using production Firebase | Require an explicit Preview QA config, verify project ID at runtime and fail closed if absent/mismatched. |
| Synthetic QA user reaching private data | Separate QA Auth user store and Firestore; no production data import, service-account reuse or cross-project grants. |
| Test mode enabled in production | Keep exact loopback plus explicit flag guard; negative browser test must reject production-origin activation. |
| Provider redirect misconfiguration | Authorize only the intended QA Preview domain in the QA project; no production OAuth credential reuse. |
| Secret exposure in CI | No Firebase production secrets in CI; emulator job uses a demo project and synthetic data only. |

Before implementation, run negative checks for: production origin cannot enable
emulator mode; query parameters cannot bypass login; missing QA config fails
closed; invalid session remains unauthenticated; and synthetic identity cannot
access production data. A deterministic emulator job may enter CI only after
these checks pass locally and no production endpoint is contacted. The current
`test:visual-regression` and release scripts remain unchanged.

## Human gate for provider-authenticated Preview QA

1. Approve and create a separate Firebase QA project with separate Auth and
   Firestore, no production data or service-account linkage.
2. Enable Google sign-in in that QA project and designate a synthetic QA
   identity. Do not use a real wallet or the user's account.
3. Authorize only the QA Preview domain and complete any provider/OAuth setup
   required by that separate project.
4. Approve a reviewed, fail-closed Preview configuration implementation before
   setting Preview-only variables in Vercel. Never put QA values in Production.
5. Run a read-only provider smoke with explicit network/write instrumentation.

References: [Firebase Auth Emulator connection](https://firebase.google.com/docs/emulator-suite/connect_auth)
and [Firebase Emulator Suite setup](https://firebase.google.com/docs/emulator-suite/install_and_configure).
