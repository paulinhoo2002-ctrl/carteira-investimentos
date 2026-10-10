# V588–V600 — Manutenção Automática do LEGACY (2026-10-10)

MISSION=V588_V600_MAINTENANCE_AUTOMATION
STATUS=COMPLETED
PROJECT_IDENTITY_GATE=PASS — worktree v588-600-maintenance, branch codex/v588-600-maintenance, base origin/main (revalidada 2× durante a missão: 11644d7 → 3a3ae40 [merge #481] → **b220684824c8a6fb85386d95733982c691b8cf0b** [merge #482]; worktree sincronizada por ff). PR #481 **MERGED** reconhecida (3a3ae40); #482 também merged (b220684). Remote correto. Checkout limpo.

## LOTE A — V588–V591: Health-check read-only — IMPLEMENTADO (novo artefato)
**`scripts/maintenance/health-check.js`** — verifica: (1) disponibilidade da produção (HTTP), (2) marcador de versão `__APP_BUILD_ID__` no HTML servido, (3) CI da origin/main via gh (read-only), (4) sanidade do checkout (HEAD vs origin/main). Saída humana + `--json`; exit 0=OK / 2=DEGRADED / 1=erro. **Read-only por construção** (testes negativos: sem POST/PUT/DELETE, sem taskkill, sem rm).
- Descobertas reais durante o desenvolvimento:
  - A URL `carteira-investimentos.vercel.app` e as variantes `*-paulinhoo2002-ctrls-projects.vercel.app` servem **OUTRO app** (Next.js) — NÃO são o LEGACY.
  - **Produção correta do LEGACY: `https://carteira-investimentos-delta.vercel.app`** (HTML de 2,4MB, `__APP_BUILD_ID__='phase4i-runtime-v2'`). URL fixada como default do health-check.
  - Firebase Hosting (web.app/firebaseapp.com do projeto 16725) responde "Site Not Found" — o LEGACY não está publicado lá.
- Estado atual (run real): **HEALTH: OK** — disponibilidade 200/2,42MB; versão phase4i-runtime-v2; CI main SUCCESS; git-sync OK.
- **Rotina IMPLEMENTADA mas NÃO AGENDADA**: o script existe e é executável; falta configuração do agendamento (cron do Hermes ou Agendador de Tarefas do Windows) — ver "Pendências".

## LOTE B — V592–V595: Verificador de integridade de backups — IMPLEMENTADO (novo artefato)
**`scripts/maintenance/backup-verify.js`** — read-only contra o backup-root aprovado (`C:\Projetos\_backups\carteira-investimentos`): formato JSON (parse + shape), hash SHA-256 recomputado vs sidecar `.sha256` quando presente, idade (warn > 35d default, `--max-age-days`), arquivo vazio=FAIL. Nunca deleta/move/restaura. Saída humana + `--json`; exit 0/2/1.
- Suíte TDD `tests/v592-backup-verify.test.js`: **7/7 PASS** (válido/corrompido/vazio/hash ok/hash divergente/stale/fresco — fixture race de timestamp corrigida com regex `-?\d+d`).
- Run real: backup-root existe e está **vazio** → WARN "no backups present" (correto — o app ainda não gerou backups locais; nenhum arquivo foi tocado).
- Procedimento de recuperação documentado: backup real permanece gated por humano; a restauração sintética certificada está em tests/backup-recovery-hardening (9/9) + lifecycle (14/14).

## LOTE C — V596–V598: Auditoria de dependências e scripts — COMPLETED (relatório)
- **`npm audit --omit=dev`: 0 vulnerabilidades de produção.**
- `npm audit` (dev): 7 (3 moderate, 4 high) — todas em devDependencies (toolchain de build/teste), sem caminho para o bundle de produção (SPA estático; app não tem server runtime). Ação sugerida: `npm audit fix` em janela de manutenção com bateria completa antes/depois; severidade média pois não afeta produção.
- **Outdated (informativo, NENHUM update executado)**: @playwright/test 1.63→1.64 (Wanted), axe-core 4.13→4.14, typescript 5.6→5.9 (Wanted) / 7.0 (Latest), react 18.3.1 (Latest 19) — atualizações major (react 19, vite plugin 6, TS 7) exigem análise de compatibilidade dedicada; NÃO executadas nesta missão (correto conforme diretiva).
- **install-scripts pendentes de aprovação** (npm security): bufferutil, es5-ext, esbuild, utf-8-validate — todos padrão de toolchain (node-gyp/esbuild binary); nenhum suspeito. Ação sugerida: `npm install-scripts approve` dos 4 na próxima manutenção.
- Scripts de manutenção do repo agora: health-check.js, backup-verify.js (novos) + root-hygiene-check.js, setup-ai.ps1 (existentes).

## LOTE D — V599–V600: Regressão + Draft PR — COMPLETED
- Testes focados novos: v588 3/3, v592 7/7.
- Bateria completa no HEAD (b220684 + artefatos): npm test **876/876**; test:modern **823/823**; verify:release **1722/1722** (exit 0); qa:all **PASS 0/0/0/0**; git diff --check clean.
- Draft PR única e temática criada (ver abaixo). Sem alterações de fórmula/financeiro; zero escritas reais.

## Verificações automatizadas agora existentes vs pendentes
| Rotina | Implementada? | Agendada? |
|---|---|---|
| Health-check diário (disponibilidade/versão/CI/git) | SIM (health-check.js) | NÃO — requer cron Hermes/Task Scheduler |
| Verificação de backups (hash/idade/formato) | SIM (backup-verify.js) | NÃO — idem |
| Auditoria de dependências | Auditoria executada agora (0 prod / 7 dev) | NÃO — sugerido mensal |
| Restore sintético | Já coberto por suítes (npm test) | Automático a cada npm test |
| Restore real | Gated por humano | Por design |

**Pendência de configuração (novo human gate leve)**: dizer "agenda health-check diário" e eu configuro o cron do Hermes (health-check + backup-verify diários, auditoria mensal) — as rotinas passam a rodar sozinhas e te aviso quando algo degradar.

## Segurança
REAL_FINANCIAL_WRITES=0; REAL_IMPORT=false; REAL_RESTORE=false; PRODUCTION_FIREBASE_CHANGES=false; UNAUTHORIZED_PROCESS_KILL=false; FORCE_PUSH=false; DESTRUCTIVE_GIT=false; MERGE=false.