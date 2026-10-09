# V402–V405 — Aceleração Final (2026-10-09)

MISSION=V402_V405_AUTONOMOUS_ACCELERATION
STATUS=COMPLETED
PROJECT_IDENTITY_GATE=PASS
MODEL_USED=z-ai/glm-5.3-flash
PR467=MERGED (squash, mergeCommit a8125b1, mergedAt 2026-10-09T22:26:47Z)
MAIN_SHA=a8125b13331d6caf0ec25a69adcdea5d189004ad

## V402 — Firebase Lifecycle Hardening
- ROOT_CAUSE comprovada: firebase-tools (Node) encerra antes do processo java filho; o emulador Firestore (java.exe cloud-firestore-emulator-v1.22.0.jar, port 8080, project demo-carteira-qa-emulator, rules desta worktree) permanece como órfão com ParentProcessId morto.
- Padrão reproduzido em 5+ ciclos: todo `test:auth-emulator` deixa órfão java na porta 8080 após shutdown "gracioso" (SIGINT).
- Ownership verificado por PID via PowerShell Get-CimInstance (CommandLine + ParentProcessId) antes de cada taskkill /F; nenhum processo desconhecido encerrado.
- 3 ciclos completos: teste 8/8 PASS em cada ciclo, com limpeza de órfão confirmada entre ciclos.
- Após limpeza, portas 8080/9099/4400/4500 confirmadas FREE.
- V394 desbloqueada na prática: com verificação de propriedade + taskkill /F de órfãos confirmados, o ciclo funciona de forma reproduzível. Ferramenta de pré-teste (portas + propriedade) recomendada; scripts existentes preservados.

## V403 — Certificação Financeira
- test:finance 94/94 PASS (FinanceCore, dividend coverage, passive income).
- tax-cost-basis-intelligence 16/16 PASS.
- v345-sale-fees-validation + local-synthetic-qa-runtime 35/35 PASS (aviso de taxas e bloqueio preservados).
- test:backup-restore 9/9 PASS; backup-recovery-hardening 53/53 PASS (suíte completa no novo run).
- Nenhuma fórmula alterada.

## V404 — QA Premium
- qa:smoke (Chromium default): OVERFLOW=0, CONSOLE_ERRORS=0, PAGE_ERRORS=0, REQUEST_ERRORS_RELEVANT=0.
- Firefox explícito (QA_BROWSER=firefox): OVERFLOW=0, CONSOLE_ERRORS=0, PAGE_ERRORS=0, REQUEST_ERRORS_RELEVANT=0 — Firefox CERTIFICADO funcional.
- WebKit explícito (QA_BROWSER=webkit): OVERFLOW=0, CONSOLE_ERRORS=0, PAGE_ERRORS=2 (apenas sw.js access control, pré-existente e inofensivo), REQUEST_ERRORS_RELEVANT=0 — WebKit funcional com aviso conhecido de service worker.
- Viewports cobertos: 390×844, 430×932, 768×1024, 1366×768, 1440×900, 1536×864, 1920×1080.
- test:visual-regression 18/18 PASS (V289 + V333 + V328/V329).
- Sem regressões novas; nenhuma correção de produto necessária.

## V405 — Final Release Candidate (main pós-merge)
- Worktree de certificação: C:\Projetos\carteira-investimentos.worktrees\v402-v405-main-rc (branch codex/v402-v405-main-rc, HEAD a8125b1, clean).
- npm ci OK; npm test completo: 14+94+32+9+7+7+4+285+97+255+20+44 = 868 testes, 0 falhas.
- npm run test:modern: 823/823 PASS.
- npm run verify:release: PASS (OVERFLOW=0, CONSOLE_ERRORS=0, PAGE_ERRORS=0).
- npm run qa:all: PASS (PAGE_ERRORS=2 apenas sw.js WebKit-style pré-existente).
- git diff --check: clean.
- CI main: run 37999257277 SUCCESS (2m5s) no SHA a8125b1.
- Vercel production: deployment 6972275814 state=success, "Deployment has completed" no SHA a8125b1. Registro técnico apenas — não equivale a certificação de produção.

## Riscos e rollback
- Rollback: git revert do merge commit a8125b1 na main (squash revert), ou reverter PR individual; sem force-push.
- Risco conhecido: órfão java do Firestore emulator na porta 8080 após cada ciclo de teste (blocker de ambiente operacional, não de produto). Mitigação: verificar propriedade por PID antes de taskkill /F.
- sw.js page error no WebKit: pré-existente, não bloqueante, não reproduzido no Chrome/Firefox.

## GO / NO_GO
- GO_NO_GO=CONDITIONAL_GO: main pós-merge a8125b1 com todas as suítes locais e CI verdes; produção aguarda decisão humana (Vercel auto-deploy já ocorreu via merge — verificar conteúdo em produção antes de uso real).
- PRODUCTION_READY=false até validação humana do conteúdo em produção.

## Próximos gates humanos
1. Revisar conteúdo em produção (Vercel) no SHA a8125b1.
2. Decidir liberação para uso diário.
3. Autorizar eventual limpeza de worktrees antigas (v316-hermes-review ainda segura).

## Segurança
REAL_WRITES=0; REAL_IMPORT=false; REAL_RESTORE=false; PRODUCTION=false (nenhum deploy manual); MERGE=#467 apenas (autorização humana prévia específica).