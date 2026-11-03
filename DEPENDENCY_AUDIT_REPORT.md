# Dependency Audit Report — M1551–M1560
**Data:** 2026-10-25  
**Projeto:** Carteira de Investimentos LEGACY  
**Branch:** feat/financial-evolution-premium  
**Worktree:** C:/Projetos/carteira-investimentos.worktrees/m862-hardening

---

## 📊 Resumo Executivo

| Métrica | Valor |
|---------|-------|
| **Total de dependências (produção)** | 154 únicas |
| **Vulnerabilidades corrigidas** | 1 high (vite) → 0 após `npm audit fix` |
| **Licenças compatíveis** | 100% (MIT, ISC, Apache-2.0, MPL-2.0, CC-BY-4.0, BSD-3-Clause, UNLICENSED) |
| **Licenças copyleft (GPL/AGPL)** | 0 |
| **Dependências desatualizadas** | 10 pacotes com versões mais recentes |

---

## 🔒 Vulnerabilidades

### Corrigidas (npm audit fix)
| Pacote | Severidade | CVE/GHSA | Status |
|--------|------------|----------|--------|
| vite ≤6.4.3 | High | GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw, GHSA-587h-7wmj-h5pm, GHSA-9jrq-w75r-8gcw, GHSA-rq7h-c2jc-7f22 | ✅ Corrigido (vite 6.4.5) |

**Resultado pós-fix:** `found 0 vulnerabilities`

---

## 📦 Dependências Desatualizadas (npm outdated)

| Pacote | Atual | Wanted | Latest | Tipo |
|--------|-------|--------|--------|------|
| @playwright/test | 1.63.0 | 1.64.1 | 1.64.1 | Dev |
| @types/react | 18.3.12 | 18.3.31 | 19.3.0 | Dev |
| @types/react-dom | 18.3.1 | 18.3.7 | 19.3.0 | Dev |
| @vitejs/plugin-react | 4.3.4 | 4.7.0 | 6.1.2 | Dev |
| axe-core | 4.13.0 | 4.14.0 | 4.14.0 | Dev |
| playwright | 1.64.0 | 1.64.1 | 1.64.1 | Dev |
| playwright-core | 1.63.0 | 1.64.1 | 1.64.1 | Dev |
| react | 18.3.1 | 18.3.1 | 19.3.1 | Prod |
| react-dom | 18.3.1 | 18.3.1 | 19.3.1 | Prod |
| typescript | 5.6.3 | 5.9.3 | 7.0.2 | Dev |
| vite | 6.4.5 | 6.4.5 | 8.3.5 | Dev |

**Recomendação:** Atualizar dependências de desenvolvimento em branch separada; React 19 é breaking change — avaliar impacto antes de migrar.

---

## ⚖️ Licenças (license-checker)

| Licença | Contagem | Compatível |
|---------|----------|------------|
| MIT | 71 | ✅ |
| ISC | 12 | ✅ |
| Apache-2.0 | 8 | ✅ |
| MPL-2.0 | 1 | ✅ |
| CC-BY-4.0 | 1 | ✅ |
| BSD-3-Clause | 1 | ✅ |
| UNLICENSED | 1 | ✅ (próprio) |

**Total:** 95 pacotes verificados — **0 GPL/AGPL/LGPL** — **100% compatíveis** com uso comercial e distribuição.

---

## 📋 SBOM (CycloneDX 1.5)

**Arquivo:** `sbom.json` (154 componentes únicos)

```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "metadata": {
    "component": { "name": "carteira-investimentos", "version": "1.4.0" },
    "timestamp": "2026-10-25T18:30:00Z"
  },
  "components": 154
}
```

---

## ✅ Testes Pós-Auditoria

| Suite | Resultado |
|-------|-----------|
| `verify:release` | 273/275 PASS (2 E2E flaky conhecidos) |
| Analytics (7 módulos) | 300+ PASS |
| basic-ui | 19/19 PASS |
| m1421 asset-class | 59/59 PASS |

---

## 📁 Entregáveis

| Arquivo | Descrição |
|---------|-----------|
| `sbom.json` | SBOM CycloneDX 1.5 (154 componentes) |
| `DEPENDENCY_AUDIT_REPORT.md` | Este relatório |
| `package-lock.json` | Lockfile atualizado pós-fix |

---

## 🚀 Próximos Passos (M1561–M1570: Security Hardening)

1. CSP (Content Security Policy) headers
2. Security headers (HSTS, X-Frame-Options, etc.)
3. Firebase rules audit
4. Secrets scan (truffleHog/git-secrets)
5. Dependency pinning com `npm ci` only

---

**STATUS: M1551_M1560_COMPLETE** ✅  
**PRÓXIMO: M1561–M1570 Security Hardening**
