# Synthetic QA authentication and route smoke

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
