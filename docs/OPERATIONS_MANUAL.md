# Manual Operacional — Carteira LEGACY (2026-10-10)

## Identificar a versão publicada
1. App em produção: **https://carteira-investimentos-delta.vercel.app** (⚠️ NÃO confundir: `carteira-investimentos.vercel.app` e `*-paulinhoo2002-ctrls-projects.vercel.app` são OUTRO projeto Next.js).
2. Ver o build: rodar `node scripts/maintenance/health-check.js` (mostra `__APP_BUILD_ID__` do HTML servido) ou, no navegador, DevTools → console: `window.__APP_BUILD_ID__`.
3. Verificar o SHA da main: `git rev-parse origin/main`; o deploy de produção acompanha cada merge (Vercel auto-deploy).
4. Deploys/SHA: `gh api repos/paulinhoo2002-ctrl/carteira-investimentos/deployments --jq '.[0] | {sha: .sha[0:7], environment}'`.

## Monitoramento ativo (cron Hermes — já agendado)
| Job | Frequência | O que faz | Entrega |
|---|---|---|---|
| LEGACY health-check diario (`856f2f096f06`) | Todo dia 09:00 (-03:00) | disponibilidade, versão, CI main, git-sync | Telegram (aqui) |
| LEGACY backup-verify diario (`092eeffee22a`) | Todo dia 09:05 | formato/hash/idade dos backups aprovados | Telegram (aqui) |
| LEGACY deps audit mensal (`353da74f06fc`) | Dia 1º, 10:00 | npm audit prod+dev, outdated, install-scripts | Telegram (aqui) |

Comandos: gerenciar via `cronjob list / pause / resume / remove`; rodar na hora: `cronjob run`.

## Interpretar alertas
- **HEALTH: OK** — nada a fazer.
- **HEALTH: DEGRADED** — algo parcial falhou (CI pendente, checkout divergente, versão sem marcador). Investigar o check marcado `[WARN]`; não é urgente.
- **HEALTH: CRITICAL (application unavailable)** — produção fora do ar (não-200 ou rede). Ação: ver Vercel dashboard do projeto LEGACY; se deploy quebrou, revert do último merge (`git revert -m 1 <sha>` + push) e o auto-deploy corrige.
- **BACKUPS: PROBLEMS FOUND** — root vazio/corrompido/hash divergente/stale. Root vazio = você ainda não copiou nenhum backup exportado (ver `docs/BACKUP_PROCEDURE.md`); corrompido/hash = não use aquele arquivo, gere backup novo.
- Silêncio = tudo OK (padrão watchdog: stdout só entrega quando há o que dizer — na prática o health-check sempre reporta; o backup-verify avisará quando o primeiro backup real aparecer e depois qualquer degradação).

## Checklist de incidente
1. Confirmar o sintoma com `node scripts/maintenance/health-check.js` (ou aguardar o cron do dia).
2. Se produção fora: dashboard Vercel (projeto `carteira-investimentos`) → deploys; verificar build log.
3. Se CI vermelho na main: `gh run list --branch main --limit 3`; abrir o run; job flaky conhecido (Auth/Firestore emulator timing) → `gh run rerun <id> --failed` primeiro.
4. Se regressão veio de um merge: `git revert -m 1 <merge-sha>` + push normal (auto-deploy). Rollback documentado e sem force-push.
5. Registrar o incidente em `docs/ai/` (um parágrafo: sintoma, causa, ação, hora).

## Procedimento de backup (dono) — resumo
Ver `docs/BACKUP_PROCEDURE.md` completo. Exportar no app (Configurações → Exportar backup) → copiar para `C:\Projetos\_backups\carteira-investimentos\` → gerar `.sha256` (comando no doc). A partir daí o cron diário valida tudo automaticamente.

## Flakes conhecidos (não são bugs)
- **Auth/Firestore emulator no CI**: timing esporádico (`financialWrites 2≠0` em push docs-only) → rerun do job resolve. Já diagnosticado (V476-V485).
- **WebKit sw.js em loopback local**: "access control checks" intermitente no smoke local; não afeta https/produção.
- **verify:release standalone**: precisa `PLAYWRIGHT_BROWSERS_PATH` nesta máquina (ou já corrigido via pretest para visual-regression).

## Segurança operacional
- CI não usa nenhum secret; credenciais Firebase só no firebase-tools local (nunca commitadas).
- Regras Firestore: UID-scoped, deny-all default (comprovadas no QA hospedado 15/15).
- Produção Firebase (carteira-de-investimento-16725): intocada por todas as missões; nenhum agente modifica.
- Backups: read-only para a automação; export/restore reais são exclusivos do dono (gates por design).