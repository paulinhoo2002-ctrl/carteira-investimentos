# Testing and Release

## Test commands

| Suite | Command | Purpose | Baseline |
|---|---|---|---|
| Static/build | `npm test` | Main build plus legacy/core/integration/regression suites | Current project baseline previously observed: 75 passing; rerun before release |
| Modern | `npm run test:modern` | Readonly React/Vite host, bridges and modern contracts | Previously observed: 750 passing; rerun before release |
| Finance | `npm run test:finance` | Finance Core contract suite | Previously observed: 80 passing |
| Persistence | `npm run test:persistence` | Persistence Core contract suite | Previously observed: 31 passing |
| Static build | `npm run build` | Required legacy files exist | PASS in recent release validation |
| Modern build | `npm run build:modern` | Vite production build | PASS in recent release validation; warnings do not replace investigation |
| Diff hygiene | `git diff --check` | Whitespace/error guard | Required before commit/review |

Counts above are recorded baselines from the latest project state, not a claim
that this documentation-only audit reran every suite.

## Browser QA contract

Codex obtains local evidence with Browser Harness/Playwright when a browser
change is in scope. Required viewports are 390x844, 430x932, 768x1024,
1366x768 and 1920x1080. Check navigation, tabs, filters, disclosures, dialogs,
keyboard/focus, bottom nav, sidebar, sticky/fixed surfaces, overflow, clipping,
console errors, page errors and relevant request failures.

Required acceptance fields:

```text
OVERFLOW=0
FINANCIAL_CLIPPING=0
CONSOLE_ERRORS=0
PAGE_ERRORS=0
REQUEST_FAILURES=0
```

Screenshots are local evidence and must not be committed when temporary.

## Release and Git safety

- Confirm repository, branch, HEAD, `origin/main` and status before work.
- Preserve dirty work and historical untracked files.
- No reset, restore, clean, automatic stash, rebase or force push.
- Commit, push, PR, merge and deploy are separate gates. This audit performs
  none of them.
- Project governance requires explicit authorization before irreversible
  release actions; merge/deploy remain separate even when CI is green.
- Prefer normal pushes and squash merge only when the approved release phase
  explicitly authorizes them.

## Production

- Recent project release history records the Vercel production URL as
  `https://carteira-investimentos-delta.vercel.app`.
- Automatic deployment is observed through the hosting/PR checks; manual deploy
  is prohibited without explicit authorization.
- Production browser QA may be blocked by authentication. Record `AUTH_GATE`
  rather than treating an inaccessible authenticated screen as a product error.
- Never edit real data during smoke validation.

## Visual reference approval gate

Visual freezes require explicit comparison against the screen's
`PRIMARY_CANON`, concise local screenshot evidence, and browser validation at
all five canonical widths. A passing test/build suite confirms functional and
build health; it does not by itself constitute visual approval. Secondary
quality references may refine finish only when they do not conflict with the
primary information architecture.

## Rollback safety

Use Git history and the existing backup/import contracts. Do not delete or
rewrite historical files to make a check pass. A failure in a protected domain
is a stop-and-report event, not a visual workaround.
