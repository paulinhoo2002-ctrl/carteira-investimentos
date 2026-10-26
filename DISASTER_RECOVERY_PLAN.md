# Disaster Recovery — M1591–M1600
**Data:** 2026-10-25  
**Projeto:** Carteira de Investimentos LEGACY  
**Branch:** feat/financial-evolution-premium

---

## Objetivo
Garantir capacidade de recuperacao total do sistema apos desastres: perda de dados, compromissao de infraestrutura, corrupcao, ataque.

---

## Metricas de Recuperacao

| Metrica | Target | Medida |
|---------|--------|--------|
| **RTO (Recovery Time Objective)** | < 4 horas | Tempo maximo para restaurar servico |
| **RPO (Recovery Point Objective)** | < 1 hora | Perda maxima de dados aceitavel |
| **RTO Critico (dados financeiros)** | < 30 min | Restauracao de portfolio/transacoes |
| **RPO Critico** | < 5 min | Zero perda de transacoes confirmadas |

---

## Cenarios de Desastre

### 1. Perda Total de Dados Firestore
**Causa:** Exclusao acidental, bug, ataque, erro humano
**Impacto:** Perda de portfolio, transacoes, proventos, metas
**RTO:** < 30 min | **RPO:** < 5 min

**Plano de Recuperacao:**
1. Identificar escopo (colecoes afetadas)
2. Parar escritas: `allow write: if false` no firestore.rules
3. Identificar ultimo backup valido (`npm run backup:verify`)
4. Restaurar: `npm run backup:restore` (script verifica hash SHA-256)
5. Validar integridade: `npm run backup:verify` pos-restore
6. Reabilitar escritas apos validacao

**Validacao Pos-Restore:**
- Contagem de documentos por colecao
- Soma de valores (portfolio, transacoes)
- Hash SHA-256 do backup vs restaurado
- Testes de integracao (`npm test`)

### 2. Comprometimento de Credenciais Firebase
**Causa:** Vazamento de service account, API key, token
**Impacto:** Acesso nao autorizado a dados, escrita maliciosa
**RTO:** < 15 min | **RPO:** 0 (nenhum dado perdido)

**Plano:**
1. Revogar credencial vazada (Firebase Console > Service Accounts > Revoke)
2. Rotacionar todas as chaves relacionadas (Firebase, Vercel, GitHub)
3. Forcar logout global: `firebase auth revokeRefreshTokens`
4. Auditar logs de acesso (Firebase, Cloudflare, Vercel)
5. Reconfigurar CI/CD com novas credenciais

### 3. Indisponibilidade Vercel / Edge
**Causa:** Outage Vercel, DNS, CDN
**Impacto:** App indisponivel
**RTO:** < 30 min (failover Vercel) | **RPO:** 0

**Plano:**
1. Verificar status Vercel (status.vercel.com)
2. Se outage confirmado: aguardar restauracao Vercel (SLA 99.99%)
3. Comunicar usuarios via canal oficial
3. Se prolongado: avaliar deploy em regiao alternativa (Vercel multi-region)

### 3. Corrupcao de Build / Deploy
**Causa:** Dependencia quebrada, CI falha, deploy corrompido
**Impacto:** App quebrado em producao
**RTO:** < 15 min | **RPO:** 0

**Plano:**
1. Identificar ultimo deploy funcional (Vercel Dashboard > Deployments)
4. Rollback imediato: `vercel rollback [deployment-url]` ou `git revert` + push
3. Investigar causa (dependency audit, CI logs)
4. Fix e novo deploy

### 4. Ataque de Seguranca (DDoS, Injection, XSS)
**Causa:** Ataque externo
**Impacto:** Indisponibilidade, vazamento, corrupcao
**RTO:** < 30 min | **RPO:** 0

**Plano:**
1. Ativar WAF Cloudflare (Under Attack Mode)
2. Bloquear IPs suspeitos (Cloudflare Firewall Rules)
3. Ativar rate limiting agressivo
4. Investigar vetor de ataque (logs Cloudflare, Firebase, Vercel)
5. Aplicar patches/mitigacoes
5. Comunicar se houver vazamento

### 4. Perda de Repositorio Git / Historico
**Causa:** Exclusao acidental, GitHub outage, conta comprometida
**Impacto:** Perda de codigo, historico, CI/CD
**RTO:** < 1 hora | **RPO:** Ultimo push

**Plano:**
1. Verificar GitHub status (status.github.com)
2. Restaurar de mirror local (`git clone --mirror`)
3. Reconfigurar CI/CD secrets
4. Reativar branch protection
5. Verificar integridade: `git fsck --full`

---

## Estrategia de Backup

### Backups Automatizados (ja implementados)
| Tipo | Frequencia | Retencao | Local | Validacao |
|------|------------|----------|-------|-----------|
| **Firestore Export** | Diario (02:00 UTC) | 30 dias | Cloud Storage | `npm run backup:verify` |
| **Git Mirror** | A cada push | Infinito | GitHub + Local | `git fsck` |
| **Config/Secrets** | Manual (apos mudanca) | Infinito | 1Password / Vault | Checksum SHA-256 |
| **SBOM** | A cada build | 90 dias | Artefato CI | `cyclonedx` validation |
| **Package-lock** | A cada `npm install` | Infinito | Git | `npm run check:lock` |

### Backup Manual (Pre-Deploy)
```bash
# Antes de deploy critico
npm run backup:create --tag=pre-deploy-$(date +%Y%m%d-%H%M%S)
npm run backup:verify
```

---

## Procedimentos de Recuperacao

### Restore Firestore (Producao)
```bash
# 1. Identificar backup valido
npm run backup:list

# 2. Restaurar (dry-run primeiro)
npm run backup:restore --backup=backup-20261025-020000 --dry-run

# 3. Restaurar de fato
npm run backup:restore --backup=backup-20261025-020000

# 4. Validar
npm run backup:verify --backup=backup-20261025-020000
```

### Rollback Deploy (Vercel)
```bash
# Via CLI
vercel rollback [deployment-url] --token=$VERCEL_TOKEN

# Ou via Git
git revert HEAD
git push origin main
# Vercel auto-deploy do revert
```

### Rollback Git (Emergencia)
```bash
# Identificar commit bom
git log --oneline -20

# Reverter
git revert <bad-commit-hash>
git push origin main

# Ou reset hard (cuidado!)
git reset --hard <good-commit>
git push origin main --force-with-lease
```

---

## Testes de Recuperacao (Drills)

### Agenda
| Drill | Frequencia | Responsavel | Duracao |
|-------|------------|-------------|---------|
| **Firestore Restore** | Mensal | DevOps | 30 min |
| **Vercel Rollback** | Mensal | DevOps | 15 min |
| **Git Rollback** | Trimestral | DevOps | 30 min |
| **Full DR Drill** | Semestral | Equipe | 2 horas |

### Checklist Drill Mensal
- [ ] Restaurar backup Firestore em projeto teste
- [ ] Validar integridade (contagens, hashes, valores)
- [ ] Testar rollback Vercel para deploy anterior
- [ ] Testar rollback Git
- [ ] Documentar tempo real (RTO real)
- [ ] Atualizar metricas RTO/RPO reais
- [ ] Reportar ao proprietario

---

## Comunicacao de Incidente

### Canais
| Severidade | Canal | Template |
|------------|-------|----------|
| **P0** | Telegram (proprietario) + Email | `🚨 P0: [Resumo] - Iniciado as HH:MM. Acao: [contencao]. ETA: XX min.` |
| **P1** | Telegram + Log | `⚠️ P1: [Resumo] - Investigando. ETA: XX min.` |
| **P2/P3** | Log interno | `ℹ️ P2: [Resumo] - Agendado para proximo sprint.` |

### Stakeholders
- **Proprietario:** Telegram @paulinhoo2002 (todos P0/P1)
- **Equipe:** Log interno (P2/P3)

---

## Metricas de Sucesso

| KPI | Target | Atual (baseline) |
|-----|--------|------------------|
| RTO Real (Firestore) | < 30 min | TBD (proximo drill) |
| RPO Real | < 5 min | TBD |
| Rollback Vercel | < 5 min | TBD |
| Rollback Git | < 10 min | TBD |
| Drill Success Rate | 100% | 0% (nao executado) |
| Mean Time to Detect | < 5 min | TBD |
| Mean Time to Respond | < 15 min | TBD |

---

## Arquivos de Apoio

| Arquivo | Localizacao | Descricao |
|---------|-------------|-----------|
| `BACKUP_RECOVERY_RUNBOOK.md` | `/docs/` | Restore detalhado |
| `FIREBASE_RULES_AUDIT.md` | `/` | Regras auditadas |
| `INCIDENT_RESPONSE_RUNBOOK.md` | `/` | Procedimentos incidente |
| `DEPENDENCY_AUDIT_REPORT.md` | `/` | Auditoria deps |
| `sbom.json` | `/` | SBOM CycloneDX |
| `scripts/rollback.sh` | `/scripts/` | Rollback automatizado |

---

## Proximos Passos

1. **Executar primeiro drill** (Firestore restore em projeto teste)
2. **Medir RTO/RPO reais** e documentar
3. **Automatizar alertas** Cloudflare/Firebase/Vercel
3. **Criar runbook especifico** por cenario
3. **Treinar** (simulacao solo)
5. **Certificar** com proprietario

---

## Certificacao Final

| Item | Status | Evidencia |
|------|--------|-----------|
| Backup automatizado diario | ✅ | `npm run backup:verify` |
| Restore testado | ⏳ | Proximo drill |
| Rollback Vercel testado | ⏳ | Proximo deploy |
| Rollback Git testado | ⏳ | Proximo drill |
| SBOM gerado | ✅ | `sbom.json` |
| Secrets scan limpo | ✅ | `SECRETS_SCAN_REPORT.md` |
| CSP/SRI implementado | ✅ | `index.html`, `vercel.json` |
| Rate limits documentados | ✅ | `CLOUDFLARE_RATE_LIMITS.md` |
| Incident runbook | ✅ | `INCIDENT_RESPONSE_RUNBOOK.md` |
| Security regression tests | ✅ | `SECURITY_REGRESSION_TESTS.md` |
| Release automation | ✅ | `RELEASE_AUTOMATION_PLAN.md` |

---

## Proximos Passos

1. **Executar primeiro drill** (Firestore restore em projeto teste)
2. **Medir RTO/RPO reais** e documentar
3. **Automatizar alertas** Cloudflare/Firebase/Vercel
4. **Certificar** com proprietario
4. **Assinar** `RELEASE_CERTIFICATION.md`

---

**RESPONSAVEL:** Hermes Agent (M1591-M1600)  
**DATA:** 2026-10-25  
**STATUS:** M1591-M1600 PLANNED - AGUARDANDO DRILLS  
**PROXIMO:** CERTIFICACAO FINAL + PR