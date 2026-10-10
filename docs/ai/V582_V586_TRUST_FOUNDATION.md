# V582–V586 — Fundação Confiável (2026-10-10)

MISSION=V582_V586_TRUST_FOUNDATION
STATUS=COMPLETED
PROJECT_IDENTITY_GATE=PASS — worktree v582-586-trust-foundation, branch codex/v582-586-trust-foundation, base origin/main 11644d74ac9c1e55b6791f5761225a780c09d1d7, remote paulinhoo2002-ctrl/carteira-investimentos, checkout limpo.
MODEL_USED=z-ai/glm-5.3 (Hermes/NVIDIA)

## V582 — Firebase QA hospedado — CERTIFIED (re-validado fresco nesta sessão)
- Suite completa re-executada contra **carteira-invest-qa-v316** (Spark, isolado da produção carteira-de-investimento-16725): **15/15 PASS** — login A/B sintético, leitura/escrita própria (200), acesso cruzado negado (403), anônimo negado (401), senha inválida rejeitada, meta/access negado a não-admin (403), persistência após novo login (200), cleanup controlado (200/404).
- NÃO é emulador: são chamadas REST reais ao Firebase Auth + Firestore hospedados do Google, com as regras canônicas do repo ativas no projeto QA.

## V583 — Segurança de usuários — CERTIFIED (semântica de sessão estendida)
- Nova verificação de sessão (6/6 PASS): token inválido → 401 (fail-closed); isolamento re-confirmado no suite 15/15.
- Rotas protegidas: comprovadas no emulador (V311 8/8 no CI por push — run mais recente no PR #481: Auth and Firestore emulator QA PASS) e a nível de regras no hospedado (deny-all default, UID-scoped users/portfolios, admin-only meta/access).

## V584 — Persistência — CERTIFIED (novo teste de ciclo completo)
- Ciclo hospedado real (6/6): gravação rev1 (200) → logout/novo login → **leitura persiste** (200, rev=1) → atualização in-place (updateTime avança, sem duplicação) → releitura única com rev=2 → cleanup. Um registro salvo sobrevive a logout + novo login no ambiente hospedado.
- Persistência sintética local (roundtrip/load/migração) já coberta pelas suítes (46+ testes verdes na bateria).

## V585 — Backup profissional — CERTIFIED (sintético, sem restore real)
- backup-restore-integration 9/9 + backup-recovery-hardening 9/9 + v324-backup-lifecycle 14/14: backup completo, validação de schema, integridade/hash, detecção de corrupção, preview antes da escrita, rollback transacional, idempotência, retenção anual/recuperação e ausência de duplicação.
- Backup-root aprovado `C:\Projetos\_backups\carteira-investimentos` preservado (vazio, sem arquivos desconhecidos).
- Nota honesta: **restauração real de carteira** permanece intencionalmente não executada (exige autorização específica e dados reais); a restauração sintética isolada é o que as suítes certificam.

## V586 — Integridade financeira — CERTIFIED
- test:finance 94/94 (FinanceCore: preço médio, valores, rentabilidade, RF bruto/líquido, cobertura mensal).
- Fiscal/vendas/RF 29/29 (tax-cost-basis 16, v345 sale-fees 3, rf-reconstruction 10) + corporate events 16/16.
- Invariantes preservados: UNKNOWN≠ZERO, MISSING≠ZERO, PARTIAL≠COMPLETE, DECLARED≠RECEIVED, EXPECTED≠RECEIVED, STALE≠CURRENT. Provento manual sem estado = PAID intacto. Zero fórmulas alteradas.

## Parecer — Critério da primeira versão estável
Conforme os critérios que você definiu:
1. Login e isolamento no hospedado: **EVIDENCIADO** (15/15 + 6/6, contas sintéticas no QA hospedado isolado).
2. Registro sobrevive a logout/novo login/reload: **EVIDENCIADO** no hospedado (V584) + reload validado humanamente em produção (7/7, V467).
3. Cálculos preservam contratos: **EVIDENCIADO** (139 testes financeiros verdes nesta sessão).
4. Backup sintético restaurável sem perda/duplicação: **EVIDENCIADO** (32 testes).
5. Recuperação de regressão de publicação: **CAMINHO EXISTE** (squash reverts documentados; CI por PR + main; Vercel por SHA).
6. Sem vulnerabilidades críticas conhecidas: **npm audit dev-only** (0 de produção em verificações anteriores); nenhum blocker operacional aberto.
**Veredito: os critérios de "primeira versão estável para uso diário com dados pessoais" estão ATENDIDOS com as evidências acima.** O que permanece por design humano: teste de mutação financeira real em produção (o dono usando o app) e merge da #481 quando o Work concluir a revisão.

## Rotinas de longo prazo (resposta à sua proposta)
- As rotinas diária/semanal/mensal/trimestral/anual que você listou NÃO existem implementadas no projeto hoje — correto não presumir. Recomendação registrada para V588-V592: implementar como checks automatizados (health-check script + cron de backup verificável + relatório de dependências), começando pela trilha A já concluída aqui.
- Trilhas A/B/C adotadas como organização das próximas missões; sem renumeração infinita.

## Segurança
REAL_FINANCIAL_WRITES=0; REAL_IMPORT=false; REAL_RESTORE=false; PRODUCTION_FIREBASE_CHANGES=false; UNAUTHORIZED_PROCESS_KILL=false; MERGE=false.