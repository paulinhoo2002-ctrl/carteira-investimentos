# Docs Overhaul — M1571–M1580
**Data:** 2026-10-25  
**Projeto:** Carteira de Investimentos LEGACY  
**Branch:** feat/financial-evolution-premium

---

## 🎯 Objetivo
Reorganizar, consolidar e padronizar toda documentação do projeto.

---

## 📋 Missões

| Missão | Foco | Entregável |
|--------|------|------------|
| **M1571** | Architecture Decision Records (ADR) | `/docs/adr/` com decisões técnicas |
| **M1572** | API Contracts | OpenAPI/Swagger para endpoints internos |
| **M1573** | Runbooks Operacionais | Deploy, rollback, backup, recovery |
| **M1574** | Onboarding Guide | Setup dev, test, debug, contribuição |
| **M1575** | Financial Invariants | Contratos matemáticos (UNKNOWN≠ZERO, PARTIAL≠COMPLETE) |
| **M1576** | Visual Design System | Tokens, componentes, breakpoints, dark/light |
| **M1577** | Migration Guides | LEGACY→2.0, v1.x→v2.x |
| **M1578** | Troubleshooting Playbook | Erros comuns, logs, debug steps |
| **M1579** | Glossário de Domínio | Termos financeiros, abreviações, regras |
| **M1580** | README Unificado | Quickstart, arquitetura, links úteis |

---

## 📁 Estrutura Alvo

```
docs/
├── adr/
│   ├── 001-use-firebase-auth.md
│   ├── 002-owner-only-rules.md
│   ├── 003-csp-sri-strategy.md
│   ├── 004-offline-first-pwa.md
│   └── 005-financial-invariants.md
├── api/
│   ├── openapi.yaml
│   └── contracts/
├── runbooks/
│   ├── deploy.md
│   ├── rollback.md
│   ├── backup-restore.md
│   └── incident-response.md
├── guides/
│   ├── onboarding.md
│   ├── migration-legacy-to-2.md
│   ├── migration-v1-to-v2.md
│   ├── troubleshooting.md
│   └── glossary.md
├── design/
│   ├── tokens.md
│   ├── components.md
│   ├── breakpoints.md
│   └── dark-light-theme.md
├── adr/
├── architecture.md
├── financial-invariants.md
├── visual-design-system.md
├── glossary.md
└── README.md (unificado)
```

---

## 📋 Status Atual

| Documento | Status | Localização Atual | Ação |
|-----------|--------|-------------------|------|
| ADRs | ❌ Não existem | - | Criar 5 ADRs |
| API Contracts | ❌ Parcial | Código espalhado | Criar OpenAPI |
| Runbooks | ✅ Parciais | BACKUP_RECOVERY_RUNBOOK.md, INCIDENT_RESPONSE_RUNBOOK.md | Consolidar |
| Onboarding | ❌ | - | Criar |
| Financial Invariants | ✅ Parcial | docs/ai/FINANCIAL_INVARIANTS.md | Expandir |
| Design System | ❌ Parcial | CSS no index.html | Documentar tokens |
| Migration Guides | ❌ | - | Criar |
| Troubleshooting | ❌ Parcial | Logs espalhados | Consolidar |
| Glossary | ❌ | Termos espalhados | Criar |
| README Unificado | ❌ | README.md fragmentado | Unificar |

---

## 📋 Próximos Passos

1. **Criar ADRs** (5 decisões principais)
2. **Criar OpenAPI spec** para endpoints internos
3. **Consolidar runbooks** existentes
4. **Criar onboarding guide**
5. **Documentar financial invariants** completamente
5. **Extrair design tokens** do CSS
5. **Criar migration guides**
5. **Consolidar troubleshooting**
5. **Criar glossary**
5. **Unificar README**

---

**RESPONSÁVEL:** Hermes Agent (M1571–M1580)  
**DATA:** 2026-10-25  
**PRÓXIMO:** M1581–M1590 Release Automation
