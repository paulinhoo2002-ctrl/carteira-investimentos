# V417–V425 — Final Reliability & Production Certification (2026-10-10)

MISSION=V417_V425_AUTONOMOUS_FINAL_ACCELERATION
STATUS=COMPLETED_WITH_DOCUMENTED_LIMITATIONS
PROJECT_IDENTITY_GATE=PASS (worktree v417-v425-final-cert, branch codex/v417-v425-final-cert, base origin/main a109d51, clean)
MODEL_USED=z-ai/glm-5.3 (Hermes/NVIDIA)
MODEL_FALLBACK=z-ai/glm-5.3-flash (não necessário nesta sessão)
TOKEN_STRATEGY=single-model execution, batched suites, grep-filtered outputs; sem segundo modelo independente disponível
SKILLS_USED=superpowers:using-superpowers, ponytail full, caveman, verification-before-completion (contagens via node --test), systematic-debugging (V419 port conflict)

MAIN_SHA=a109d51f5e30ccbc9a8a39fc53ff5db8ed1b87c9 (#469 squash-merged 2026-10-10T11:51:03Z)
FINAL_HEAD=a109d51 + documentação desta missão (worktree)

## V417 — Certificação pós-merge — PASS
- npm test completo: 868 testes / 868 pass / 0 fail.
- test:modern: 823/823.
- verify:release: PASS (inclui build, modern, qa:all, visual 18/18).
- qa:all: PASS (OVERFLOW=0, CONSOLE_ERRORS=0, PAGE_ERRORS=0, REQUEST_ERRORS_RELEVANT=0).
- git diff --check: clean.
- CI main: run `38049861320` SUCCESS (2m32s) no push do a109d51 — CI da main nova, não do HEAD antigo da PR.
- Vercel: produção acompanha a main; SUCCESS de deploy é registro técnico, não certificação funcional.
- V289 visual: 18/18.

## V418 — Firebase precheck e segurança — PASS
- Utilitário integrado na main via #469 auditado: identificação fail-closed por argumentos exatos (java.exe + cloud-firestore-emulator*.jar + --project_id demo-carteira-qa-emulator + --rules resolvido por path.win32.resolve contra o root exato), pai morto obrigatório, revalidação de PID+identidade imediatamente antes de qualquer kill, falhas de PowerShell/CIM retornam null → nunca confirmado.
- Suíte negativa: 17/17 PASS (inclui projeto errado, produção, caminho irmão look-alike, PID reciclado, comando ambíguo, firebase-tools bare, outro repo root).
- Execução real dry (sem kill): precheck reportou 1 processo na porta 8080 como UNKNOWN — órfão java do Firestore emulator cujo --rules aponta para a worktree irmã v406-v415-overnight (mesmo repo LEGACY, mesmo projeto QA, pai morto). Comportamento correto: o precheck desta worktree só mata órfãos cujo rules apontam para o SEU root; cross-worktree permanece intocado com HUMAN_BLOCKER_PROCESS_IDENTITY. FAIL-CLOSED confirmado em produção real.
- `--kill-confirmed` NÃO executado nesta missão, conforme diretiva.

## V419 — Auth e persistência — PARTIAL (port conflict)
- test:auth-emulator bloqueado: porta 8080 ocupada pelo órfão java da worktree irmã (PID 110840, confirmado via precheck; kill proibido nesta missão por V418). AUTH_EMULATOR_QA=PORT_CONFLICT_SIBLING_ORPHAN.
- Fallback executado sem emulador: v284 write-boundary 81/81, e2e-auth-mode 7/7, local-synthetic runtime 32/32, cloud-sync-state 10/10 — todos PASS.
- PROVIDER_QA=NOT_TESTED (autenticação real de provedor indisponível; nenhuma certificação inventada).
- Nota: o ciclo 8/8 do emulador foi comprovado em V407 (3 ciclos completos) no mesmo binário/config; a limitação aqui é ambiental e documentada, não de produto.

## V420 — Backup e recuperação — PASS
- backup-restore-integration 9/9; backup-recovery-hardening 9/9; v324-backup-lifecycle 14/14.
- Backup-root aprovado preservado; nenhum restore real.

## V421 — Auditoria financeira — PASS
- test:finance 94/94; tax-cost-basis 16/16; v345-sale-fees 3/3; rf-reconstruction + income-linkage 10/10.
- Invariantes UNKNOWN≠ZERO, MISSING≠ZERO, PARTIAL≠COMPLETE, EXPECTED≠RECEIVED, DECLARED≠RECEIVED, STALE≠CURRENT preservados (suítes de cobertura canônicas verdes).
- Nenhuma fórmula alterada; nenhum defeito demonstrado nesta fase.

## V422 — Premium UX multinavegador — PASS
- Chromium: OVERFLOW=0/CONSOLE=0/PAGE=0/REQUEST=0 em 390×844…1920×1080.
- Firefox: idêntico — zero erros.
- WebKit: OVERFLOW=0/CONSOLE=0; sw.js "access control checks" reaparece de forma INTERMITENTE (run 1: 0 erros; run 2: 2 pageErrors + 2 requests sw.js; run 3: 0). Flaky conhecido do service worker no WebKit contra 127.0.0.1, pré-existente, não relacionado a mudanças recentes; não suprimido — documentado.
- V289 visual regression 18/18 (matriz de rotas, temas, teclado, foco, axe a11y).

## V423 — Performance e estabilidade — PASS
- performance-reports 2/2; historical-performance-engine 21/21; v330 (inclui benchmarks de escala 1/10/100 notas) 20/20.
- Benchmarks sintéticos existentes verdes; nenhum gargalo novo demonstrado; nenhuma fórmula tocada.

## V424 — Revisão independente — NOT_PERFORMED
- Nenhum segundo modelo independente disponível no runtime nesta sessão. INDEPENDENT_REVIEW=NOT_PERFORMED. O diff desta missão é somente documentação (zero mudanças de código).

## V425 — Certificação final — CONDITIONAL_GO
- Gates no HEAD final (a109d51 + docs): todos verdes (ver V417).
- Matriz: financeiro PASS, backup PASS, UX multibrowser PASS (WebKit com aviso flaky), auth emulator PARTIAL (conflito ambiental), provider QA NOT_TESTED.
- GO_NO_GO=CONDITIONAL_GO — limitações conhecidas com controles claros.
- PRODUCTION_READY=false (persistência autenticada real e validação funcional humana em produção pendentes).
- Rollback: revert do merge a109d51 (squash revert), sem force-push.

## Riscos e pendências operacionais
1. Órfão java na 8080 (worktree irmã): resolver com `node scripts/qa/firebase-precheck.js --kill-confirmed` a partir da PRÓPRIA worktree v406-v415-overnight (regras batem com o root dela), ou manualmente após inspeção.
2. sw.js WebKit flaky: pré-existente; investigar causa do access-control intermittent apenas se escalar.
3. PROVIDER_QA=NOT_TESTED: gate humano para teste de provedor real antes de GO final.

NEXT_HUMAN_GATE=Validação funcional em produção (SHA a109d51) + decisão de liberação; teste de autenticação de provedor real quando disponível.
REAL_WRITES=0; REAL_IMPORT=false; REAL_RESTORE=false; MANUAL_PRODUCTION_DEPLOY=false; MERGE=false.