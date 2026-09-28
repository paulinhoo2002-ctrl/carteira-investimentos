# Product Evolution Phase 2 - Wave 5

## Safe automation foundation

Status: `REVIEWED` - no new automation behavior required.

The current product already has bounded automation paths. This wave records
their safety boundary instead of adding another scheduler, persistence path, or
external write flow.

### Existing guarded automation

- Market refresh is guarded by `S.qInFlight`, uses the existing quote sources,
  and is skipped from external behavior in local test mode.
- Automatic proventos use a 1400 ms debounce, `S.autoProvRunning`, the edit
  ownership lock, and duplicate keys before updating existing provento data.
- Cloud synchronization starts only through the existing Firebase/auth and edit
  ownership flow. No new write is introduced here.
- PWA update checks remain event-driven by the existing focus, visibility and
  online listeners.

### Deliberate exclusions

- No new timer or background worker.
- No new notification or recommendation engine.
- No Firebase write, auth change, security change, schema change, or migration.
- No automatic buy, sell, rebalance, import, restore, reset, or delete.
- No automation was added to search, filters, sorting, tabs, or local audit.

### Decision

`SAFE_AUTOMATION_FOUNDATION=EXISTING_GUARDS_PRESERVED`

The next safe expansion requires a separately approved operation contract and
real external-flow validation. The current wave is intentionally documentation
and regression-guard only.
