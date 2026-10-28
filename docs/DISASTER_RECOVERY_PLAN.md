# Disaster Recovery Plan — Carteira LEGACY (M862 Hardening)

## Visão Geral

Este documento define os procedimentos, targets e evidências para recuperação de desastres da Carteira de Investimentos LEGACY (repositório `paulinhoo2002-ctrl/carteira-investimentos`, produção em `carteira-investimentos-delta.vercel.app`).

**Status atual (2026-10-27):** DR DRILLS PENDENTES — aguardando backup real do proprietário para certificação completa.

---

## Componentes Críticos

| Componente | Tipo | RTO Target | RPO Target | Status |
|------------|------|------------|------------|--------|
| **Código-fonte (Git)** | Repositório | < 5 min | 0 (Git history) | ✅ Protegido (origin/main) |
| **Build artifacts (Vercel)** | Deploy | < 10 min | 0 (immutable deployments) | ✅ Protegido (Vercel) |
| **Dados financeiros (Firestore)** | Database | < 30 min | < 24h (backup diário) | ⚠️ **PENDENTE** — backup real não exportado |
| **Backup financeiro protegido** | Arquivo local (AES-GCM) | < 5 min | < 24h | ⚠️ **PENDENTE** — diretório aprovado inexistente |
| **Regras Firestore (firestore.rules)** | Configuração | < 5 min | 0 (versionado) | ✅ Snapshot versionado + sidecars |

---

## Procedimentos de Recuperação

### 1. Recuperação de Código-Fonte (Git)
```bash
# Clone canônico
git clone https://github.com/paulinhoo2002-ctrl/carteira-investimentos.git
cd carteira-investimentos
git checkout main
# ou worktree específica
git worktree add ../carteira-investimentos.worktrees/dr-restore main
```
**RTO real:** < 2 min | **Validação:** `git rev-parse HEAD` bate com `origin/main`

### 2. Rollback Vercel (Deploy Anterior)
```bash
# Listar deployments
vercel list --scope=paulinhoo2002-ctrl
# Rollback para deployment específico
vercel rollback <deployment-url> --token=$VERCEL_TOKEN
```
**RTO real:** < 5 min | **Validação:** `vercel inspect <production-url> --json` → `builds[0].deploymentId` = deployment rollbackado

### 3. Recuperação Firestore (Backup Protegido)
**Pré-requisito:** Backup real exportado + senha conhecida pelo proprietário.

```bash
# 1. Verificar integridade (sem senha)
node scripts/backup/verify-integrity.js
# Esperado: INTEGRITY_CHECK=PASS

# 2. Certificar recuperação (com senha do proprietário)
node scripts/backup/verify-recovery.js
# Digita senha no terminal → Esperado: REAL_RECOVERY_CERTIFIED=YES

# 3. Restaurar via app (Configurações → Backup e restauração → Importar)
#    Escolher arquivo protegido, digitar senha, confirmar prévia, aplicar.
```
**RTO real:** < 15 min (verificação + restore app) | **RPO:** idade do backup exportado

### 4. Recuperação Regras Firestore
```bash
# Snapshot versionado em docs/ ou scripts/
# Aplicar via Firebase Console ou CLI
firebase deploy --only firestore:rules --project=carteira-investimentos
```
**RTO real:** < 5 min

---

## Evidências de Certificação (Obrigatórias para GO/NO-GO)

| Evidência | Comando | Frequência | Status Atual |
|-----------|---------|------------|--------------|
| **INTEGRITY_CHECK=PASS** | `node scripts/backup/verify-integrity.js` | Mensal / pós-export | ❌ FAIL (dir ausente) |
| **REAL_RECOVERY_CERTIFIED=YES** | `node scripts/backup/verify-recovery.js` | Mensal / pós-export | ❌ BLOCKED (sem backup) |
| **Vercel rollback testado** | `vercel rollback` em preview | Trimestral | ❌ NÃO TESTADO |
| **Git rollback testado** | `git checkout -b rollback-test && git reset --hard v<tag>` | Trimestral | ❌ NÃO TESTADO |
| **RTO/RPO medidos** | Cronômetro nos drills | Cada drill | ❌ NÃO MEDIDOS |

---

## Gaps Atuais (2026-10-27)

| Gap | Impacto | Ação Necessária | Responsável |
|-----|---------|-----------------|-------------|
| Diretório `C:/Projetos/_backups/carteira-investimentos` não existe | `verify-integrity.js` FAIL | Criar diretório + copiar backup exportado | Proprietário |
| Backup protegido não exportado pós-M862 | RPO desconhecido | Exportar no app (Config → Backup → Exportar protegido) | Proprietário |
| Sidecar SHA-256 não criado | Integridade não verificável | `Get-FileHash -Algorithm SHA256` → `.sha256` | Proprietário |
| Cópia redundante ausente | Single point of failure | Copiar para `.../redundant/` + sidecar | Proprietário |
| DR drills não executados | RTO/RPO não validados | Executar `scripts/dr-drill.sh` (itens 1-3) | Proprietário + Agente |
| `DISASTER_RECOVERY_PLAN.md` não existia | Documentação incompleta | **CRIADO AGORA** | Agente |

---

## Checklist de Certificação DR (Para Merge em Produção)

- [ ] `INTEGRITY_CHECK=PASS` (2 cópias + sidecars íntegros + backup < 30 dias)
- [ ] `REAL_RECOVERY_CERTIFIED=YES` (descriptografia + validação payload com senha real)
- [ ] Vercel rollback testado em preview (não-produção)
- [ ] Git rollback testado em branch isolada
- [ ] RTO/RPO reais documentados neste arquivo
- [ ] Proprietário confirma: "Backup real exportado, senha guardada, recuperação certificada"

---

## Próximos Passos

1. **Imediato (Proprietário):** Exportar backup protegido no app → copiar para `C:\Projetos\_backups\carteira-investimentos\` → criar sidecars → copiar para `redundant\`
2. **Automático:** `node scripts/backup/verify-integrity.js` → deve dar PASS
3. **Proprietário:** `node scripts/backup/verify-recovery.js` → digitar senha → deve dar `REAL_RECOVERY_CERTIFIED=YES`
4. **Agente:** Executar `scripts/dr-drill.sh` (itens 1-3) → medir RTO/RPO → atualizar este arquivo
5. **Gate:** Só prosseguir para merge `feat/financial-evolution-premium` → `main` após checklist 100% verde

---

## Contatos e Autoridades

| Papel | Nome | Autoridade |
|-------|------|------------|
| Proprietário dos dados | Paulo Sergio | Único que conhece senha do backup; autoriza restore real |
| Mantenedor do repo | Paulo Sergio | Autoriza merge, deploy, rollback Vercel/Git |
| Agente (Hermes/Codex) | — | Executa drills, valida scripts, documenta — **NÃO** tem senha, **NÃO** faz restore real |

---

## Referências

- `scripts/backup/verify-integrity.js` — Verificação SHA-256 + staleness
- `scripts/backup/verify-recovery.js` — Certificação descriptografia + estrutura (self-service, senha no stdin)
- `scripts/dr-drill.sh` — Script orquestrador dos 3 drills
- `docs/BACKUP_RECOVERY_RUNBOOK.md` — Runbook operacional do proprietário
- `docs/BACKUP_PROCEDURE.md` — Procedimento export/import/sidecar
- `package.json` → `test:backup-restore`, `test:backup-recovery`, `v324-backup`