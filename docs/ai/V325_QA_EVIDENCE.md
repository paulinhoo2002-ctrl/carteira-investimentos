# V325 QA evidence

The modern host browser smoke is an explicit local gate, separate from
`test:modern`; it uses an isolated headless browser and a local Vite Preview.
No external Preview URL or browser profile is used by the default suite.

PowerShell, terminal 1 (from the repository root):

```powershell
npm.cmd run build:modern
npm.cmd exec -- vite preview --config modern/vite.config.ts --host 127.0.0.1
```

PowerShell, terminal 2 (same worktree):

```powershell
$env:MODERN_HOST_URL='http://127.0.0.1:4173/host.html'
node --experimental-strip-types --test --test-name-pattern='deep links restore route and keep browser history' tests/modern-host.smoke.test.js
```

V325 result: **PASS, 1/1**. This covers deep-link load, query/hash preservation,
refresh, Back/Forward, chart accessibility references, mobile overflow, and
console/page/request errors against the local Preview build.

The legacy Ctrl+K readonly-command smoke is also a separate local synthetic
gate:

```powershell
node --test --test-name-pattern='comando de navegação Ctrl' tests/product-usability-02-search.smoke.test.js
```

V325 result: **PASS, 1/1**. The test observes zero `save`, `localStorage`, and
`queueCloudSave` calls while the navigation command changes the visible route.
