# Mozilla Observatory & SSL Labs Scan — M1568
**Data:** 2026-10-25  
**Projeto:** Carteira de Investimentos LEGACY  
**URL Produção:** https://carteira-investimentos-delta.vercel.app  
**Branch:** feat/financial-evolution-premium

---

## 🎯 Objetivo
Executar e documentar scans de segurança via Mozilla Observatory e SSL Labs para validar configurações de headers, TLS, CSP e obter nota A+.

---

## 🔍 Mozilla Observatory Scan

### Como Executar
```bash
# Via CLI (requer Node.js)
npx observatory-cli https://carteira-investimentos-delta.vercel.app --rescan

# Ou via web
# https://observatory.mozilla.org/analyze/carteira-investimentos-delta.vercel.app
```

### Critérios para Nota A+

| Teste | Requisito | Status Atual (esperado) |
|-------|-----------|------------------------|
| **Content Security Policy** | Presente, sem `unsafe-inline`/`unsafe-eval` desnecessários | ⚠️ Parcial (tem `unsafe-inline`/`unsafe-eval` por Firebase) |
| **Cookies** | `Secure`, `HttpOnly`, `SameSite=Strict/Lax` | ✅ Firebase usa cookies seguros |
| **Cross-origin Resource Sharing** | Restrito | ✅ CSP restringe origins |
| **HTTP Public Key Pinning (HPKP)** | Não obrigatório (depreciado) | N/A |
| **HTTP Strict Transport Security (HSTS)** | `max-age>=31536000; includeSubDomains; preload` | ✅ Vercel adiciona automaticamente |
| **Referrer Policy** | `strict-origin-when-cross-origin` ou mais restrito | ✅ Configurado no vercel.json |
| **Subresource Integrity** | Presente para recursos externos | ✅ Adicionado em M1566 |
| **X-Content-Type-Options** | `nosniff` | ✅ Configurado |
| **X-Frame-Options** | `DENY` ou `SAMEORIGIN` | ✅ `DENY` configurado |
| **X-XSS-Protection** | `1; mode=block` (legado) | ⚠️ Depreciado, CSP substitui |

---

## 🔒 SSL Labs Scan (Qualys)

### Como Executar
```bash
# Via web
# https://www.ssllabs.com/ssltest/analyze.html?d=carteira-investimentos-delta.vercel.app

# Via CLI (sslyze)
pip install sslyze
sslyze --regular carteira-investimentos-delta.vercel.app:443
```

### Critérios para Nota A+

| Critério | Requisito | Status Vercel (esperado) |
|----------|-----------|------------------------|
| **Certificado** | Válido, emitido por CA confiável | ✅ Let's Encrypt / DigiCert |
| **Cadeia de Certificação** | Completa, sem erros | ✅ |
| **Protocolo TLS** | TLS 1.2, TLS 1.3 apenas | ✅ Vercel suporta 1.2+ |
| **Cipher Suites** | Apenas AEAD (AES-GCM, ChaCha20-Poly1305) | ✅ |
| **Forward Secrecy** | ECDHE em todas as suites | ✅ |
| **HSTS** | `max-age>=31536000; includeSubDomains; preload` | ✅ |
| **OCSP Stapling** | Habilitado | ✅ Vercel suporta |
| **Certificate Transparency** | Logs CT presentes | ✅ |

---

## 📊 Resultados Esperados

### Mozilla Observatory
```
Score: A+ (ou A se unsafe-inline/eval necessário para Firebase)
Tests Passed: 10/11 (X-XSS-Protection depreciado)
```

### SSL Labs
```
Overall Rating: A+
Certificate: A+
Protocol Support: TLS 1.2, TLS 1.3
Cipher Suites: All strong (AEAD only)
HSTS: Yes (Preloaded)
OCSP Stapling: Yes
```

---

## 📋 Configurações Atuais (vercel.json + index.html)

### Headers de Segurança Configurados
```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 'sha384-Yvt2jmTtQFEtXIVH1VgGfieY/D91UJNVwWdiVUirr4Gwov6BPGKdjcxOWDiaZ5wF' 'sha384-mU3FzJNJ/BZ17S5514rJB3bxwX2qryHVXXuRmnJh6/eBWwz7tz4mjDWcp1yhYIix'; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.brapi.com.br; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload  (adicionado pelo Vercel)
```

### SRI Hashes Adicionados
| Recurso | Hash SHA-384 |
|---------|--------------|
| Inter Font (Google Fonts) | `sha384-Yvt2jmTtQFEtXIVH1VgGfieY/D91UJNVwWdiVUirr4Gwov6BPGKdjcxOWDiaZ5wF` |
| Material Symbols Font | `sha384-mU3FzJNJ/BZ17S5514rJB3bxwX2qryHVXXuRmnJh6/eBWwz7tz4mjDWcp1yhYIix` |
| Google APIs (api.js) | `sha384-g1coTy/n6p1VJvF7APCLXmzNam/zU59RuKuX5CLXjRcdpwIV/MR/SDGUULKPnIS6` |

---

## ⚠️ Observações

### Itens que Impedem A+ Perfeito
1. **`unsafe-inline` / `unsafe-eval` no CSP** — Necessário para Firebase SDK funcionar
   - Mitigação: SRI hashes para recursos externos, CSP restritivo nos demais pontos

2. **X-XSS-Protection** — Header depreciado, substituído por CSP
   - Não afeta score moderno

### Recomendações Pós-Scan
1. Submeter domínio para HSTS Preload List: https://hstspreload.org/
2. Configurar `Expect-CT` header se certificado suportar
3. Monitorar relatórios CSP via `report-uri` (opcional)

---

## ✅ Checklist de Validação Pós-Deploy

| Item | Comando | Status |
|------|---------|--------|
| Mozilla Observatory | `npx observatory-cli https://carteira-investimentos-delta.vercel.app --rescan` | ⏳ Pendente |
| SSL Labs | `sslyze --regular carteira-investimentos-delta.vercel.app:443` | ⏳ Pendente |
| HSTS Preload | Submeter em https://hstspreload.org/ | ⏳ Pendente |
| CSP Report Only (teste) | Adicionar `Content-Security-Policy-Report-Only` | ⏳ Opcional |

---

## 📁 Arquivos Relacionados

| Arquivo | Descrição |
|---------|-----------|
| `vercel.json` | Headers de segurança + CSP |
| `index.html` | CSP meta tag + SRI hashes + preconnect |
| `CLOUDFLARE_RATE_LIMITS.md` | Rate limiting config |
| `FIREBASE_RULES_AUDIT.md` | Firebase security audit |
| `SECRETS_SCAN_REPORT.md` | Secrets scan report |

---

## 📝 Próximos Passos

1. **Executar scans** após próximo deploy em produção
2. **Documentar resultados** reais neste documento
3. **Submeter HSTS preload** após confirmação A+
4. **Configurar CSP reporting** (opcional) para monitorar violações
5. **Próximo:** M1569 — Incident Response Runbook

---

**RESPONSÁVEL:** Hermes Agent (M1568)  
**DATA:** 2026-10-25  
**PRÓXIMO:** M1569 — Incident Response Runbook
