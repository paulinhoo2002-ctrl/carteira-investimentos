# Incident Response Runbook — M1569
**Data:** 2026-10-25  
**Projeto:** Carteira de Investimentos LEGACY  
**Versão:** 1.0  
**Classificação:** Interno - Sensível

---

## 🎯 Objetivo
Procedimentos padronizados para resposta a incidentes de segurança, disponibilidade e integridade de dados.

---

## 📞 Contatos de Emergência

| Função | Nome | Contato | Escalação |
|--------|------|---------|-----------|
| **Security Lead** | Proprietário | Telegram: @paulinhoo2002 | Imediata |
| **DevOps** | Hermes Agent | Via Telegram | 15 min |
| **Firebase Admin** | Proprietário | Console Firebase | 30 min |
| **Vercel Support** | - | Vercel Dashboard | 1 hora |

---

## 🚨 Classificação de Incidentes

| Severidade | Definição | SLA Resposta | SLA Resolução | Exemplos |
|------------|-----------|--------------|---------------|----------|
| **P0 - Crítico** | Perda de dados, vazamento, indisponibilidade total | 15 min | 2 horas | Vazamento de credenciais, Firebase comprometido, dados corrompidos |
| **P1 - Alto** | Funcionalidade principal indisponível | 30 min | 4 horas | Auth falha, Firestore indisponível, build quebrado |
| **P2 - Médio** | Funcionalidade parcial degradada | 2 horas | 8 horas | Lenta performance, CSP violations, rate limit excessivo |
| **P3 - Baixo** | Issue menor, workaround existe | 8 horas | 24 horas | Bug UI, warning CSP, log noise |

---

## 🔴 Procedimentos P0 - Crítico

### 1. Vazamento de Credenciais / Secrets
**Detecção:** Alerta GitHub/Cloudflare, scan TruffleHog, relatório externo

**Ações Imediatas (≤ 15 min):**
1. Revogar credencial vazada imediatamente
   - Firebase: Console > Project Settings > Service Accounts > Revoke
   - GitHub: Settings > Developer settings > Personal access tokens > Revoke
   - Vercel: Settings > Tokens > Revoke
2. Rotacionar todas as credenciais relacionadas
3. Forçar logout de todas as sessões (Firebase: `revokeRefreshTokens`)
4. Auditar logs de acesso (Cloudflare, Firebase, Vercel) para uso indevido
5. Notificar proprietário via Telegram

**Pós-incidente (≤ 2 horas):**
- Gerar novas credenciais
- Atualizar CI/CD secrets
- Documentar timeline e impacto
- Revisar políticas de armazenamento de secrets

### 2. Comprometimento Firebase / Firestore
**Detecção:** Alertas Firebase, acessos anômalos nas rules, logs de acesso suspeitos

**Ações Imediatas (≤ 15 min):**
1. Desabilitar regras de escrita temporariamente:
```javascript
// firestore.rules - EMERGÊNCIA
match /databases/{database}/documents {
  match /{document=**} {
    allow read, write: if false;  // BLOQUEIO TOTAL
  }
}
```
2. Revogar tokens de acesso suspeitos (Firebase Console > Authentication > Users > Revoke tokens)
4. Verificar integridade dos dados (comparar com backup mais recente)
5. Analisar logs de acesso (Firebase Console > Logs)

**Pós-incidente:**
- Restaurar regras originais após investigação
- Restaurar dados do backup se necessário (`npm run backup:restore`)
- Auditar regras de segurança
- Rotacionar todas as chaves de serviço

### 3. Corrupção / Perda de Dados
**Detecção:** Testes falham, relatórios inconsistentes, usuário relata dados errados

**Ações Imediatas (≤ 30 min):**
1. Identificar escopo (usuário específico, coleção, projeto inteiro)
2. Parar escritas (regra `allow write: if false`)
3. Identificar último backup íntegro (`npm run backup:verify`)
4. Restaurar do backup (`npm run backup:restore`)

**Pós-incidente:**
- Validar integridade pós-restore (`npm run backup:verify`)
- Identificar causa raiz (bug, migração, erro humano)
- Implementar fix e testes de regressão

---

## 🟠 Procedimentos P1 - Alto

### 1. Indisponibilidade Autenticação
**Sintomas:** Usuários não conseguem logar, `auth/current-user` falha

**Ações:**
1. Verificar status Firebase (https://status.firebase.google.com/)
2. Verificar Vercel Functions (se houver)
3. Verificar Cloudflare WAF/Rate Limit bloqueando
5. Se Firebase down: aguardar restauração, comunicar usuários

### 2. Firestore Indisponível / Lentidão Extrema
**Sintomas:** Timeouts, erros `PERMISSION_DENIED`, `UNAVAILABLE`

**Ações:**
1. Verificar quota Firebase (https://console.firebase.google.com/project/_/usage)
2. Verificar rules não estão bloqueando legítimo
3. Verificar índices faltando (logs mostram `failed-precondition`)
4. Se quota excedida: upgar plan ou otimizar queries

### 3. Build/Deploy Falhando
**Sintomas:** CI falha, Vercel deploy error

**Ações:**
1. Verificar logs CI (GitHub Actions / Vercel)
2. Verificar `npm ci` localmente
3. Verificar dependências (`npm audit`, `npm outdated`)
4. Rollback para último deploy funcionando (Vercel: `vercel rollback`)

---

## 🟡 Procedimentos P2 - Médio

### 1. CSP Violations Excessivos
**Detecção:** Relatórios CSP (se configurado), erros no console

**Ações:**
1. Analisar relatórios (endpoint CSP report-uri)
2. Identificar recurso bloqueado legítimo
3. Ajustar CSP (adicionar hash SRI, domínio, ou remover `unsafe-inline` desnecessário)
4. Deploy fix

### 2. Rate Limit Excessivo (Cloudflare/Firebase)
**Detecção:** Erros 429, usuários reportam bloqueio

**Ações:**
1. Verificar dashboards Cloudflare/Firebase
2. Ajustar thresholds se legítimo
4. Investigar origem (bot, ataque, uso legítimo intenso)
5. Whitelist IPs conhecidos se necessário

### 3. Performance Degradada
**Sintomas:** LCP > 4s, TTI > 5s, usuários reclamam

**Ações:**
1. Verificar Vercel Analytics / Web Vitals
2. Verificar bundle size (`npm run build && npx vite-bundle-analyzer`)
3. Verificar queries Firestore lentas (explain plan)
4. Otimizar: code splitting, lazy loading, índices

---

## 🟢 Procedimentos P3 - Baixo

### 1. CSP Warnings / Console Errors
- Analisar, ajustar CSP se falso positivo
- Documentar exceções necessárias

### 2. Bugs UI / UX
- Triar no backlog
- Fix no próximo sprint

### 3. Log Noise / Warnings
- Ajustar log levels
- Filtrar ruído conhecido

---

## 🔄 Procedimento Pós-Incidente (Todos os Níveis)

### 1. Timeline
Documentar com timestamps:
- Detecção
- Início resposta
- Contenção
- Erradicação
- Recuperação
- Lições aprendidas

### 2. Root Cause Analysis (RCA)
- **5 Whys** ou **Fishbone Diagram**
- Identificar causa raiz (não sintoma)
- Ações corretivas vs preventivas

### 3. Ações de Melhoria
| Ação | Responsável | Prazo | Status |
|------|-------------|-------|--------|
| Ex: Adicionar alerta CSP | DevOps | 1 semana | ⏳ |

### 4. Atualização de Runbook
- Atualizar este documento com lições aprendidas
- Revisar a cada incidente P0/P1

---

## 📋 Checklists Rápidos

### Checklist P0 (Primeiros 15 min)
- [ ] Identificar tipo de incidente
- [ ] Notificar Security Lead
- [ ] Contenção imediata (revogar, bloquear, restaurar)
- [ ] Comunicar stakeholders
- [ ] Iniciar timeline

### Checklist P1 (Primeiros 30 min)
- [ ] Identificar causa
- [ ] Aplicar workaround/fix
- [ ] Monitorar recuperação
- [ ] Comunicar usuários se necessário

### Checklist Pós-Incidente (24h)
- [ ] Timeline completa
- [ ] RCA documentado
- [ ] Ações de melhoria criadas
- [ ] Runbook atualizado
- [ ] Stakeholders informados

---

## 📁 Arquivos de Apoio

| Arquivo | Localização | Descrição |
|---------|-------------|-----------|
| `BACKUP_RECOVERY_RUNBOOK.md` | `/docs/` | Restore de backup |
| `FIREBASE_RULES_AUDIT.md` | `/` | Regras Firebase auditadas |
| `SECRETS_SCAN_REPORT.md` | `/` | Secrets scan |
| `DEPENDENCY_AUDIT_REPORT.md` | `/` | Dependency audit |
| `sbom.json` | `/` | Software Bill of Materials |

---

## 📝 Histórico de Incidentes

| Data | Severidade | Tipo | Resumo | Status |
|------|------------|------|--------|--------|
| 2026-10-25 | - | - | Runbook criado | ✅ |

---

## 📝 Próximos Passos

1. **Testar procedimentos** em ambiente de staging
2. **Treinar equipe** (mesmo que solo) nos procedimentos
3. **Configurar alertas** automatizados (Cloudflare, Firebase, Vercel)
4. **Próximo:** M1570 — Security Regression Tests

---

**RESPONSÁVEL:** Hermes Agent (M1569)  
**DATA:** 2026-10-25  
**PRÓXIMA REVISÃO:** Após primeiro incidente real ou em 90 dias  
**PRÓXIMO:** M1570 — Security Regression Tests