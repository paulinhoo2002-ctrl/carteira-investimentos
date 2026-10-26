# Cloudflare Rate Limiting Configuration — M1567
**Data:** 2026-10-25  
**Projeto:** Carteira de Investimentos LEGACY  
**Branch:** feat/financial-evolution-premium

---

## 🎯 Objetivo
Configurar rate limiting no Cloudflare para proteger endpoints sensíveis contra abuso, brute force e DDoS.

---

## 📋 Regras Recomendadas

### 1. Login / Autenticação (Mais Restritivo)
| Parâmetro | Valor |
|-----------|-------|
| **Path** | `/auth/*`, `/api/auth/*` |
| **Method** | POST |
| **Threshold** | 5 requests |
| **Period** | 1 minuto |
| **Action** | Block (429) |
| **Response** | `{"error": "Too many login attempts. Try again later."}` |

### 2. Escrita de Dados (Aportes, Proventos, Ativos)
| Parâmetro | Valor |
|-----------|-------|
| **Path** | `/api/portfolio/*`, `/api/assets/*`, `/api/dividends/*`, `/api/goals/*` |
| **Method** | POST, PUT, PATCH, DELETE |
| **Threshold** | 30 requests |
| **Period** | 1 minuto |
| **Action** | Block (429) |

### 3. Leitura de Dados (Dashboard, Relatórios)
| Parâmetro | Valor |
|-----------|-------|
| **Path** | `/api/*` (GET) |
| **Method** | GET |
| **Threshold** | 100 requests |
| **Period** | 1 minuto |
| **Action** | Challenge (JS Challenge) |

### 4. Firebase Auth Endpoints
| Parâmetro | Valor |
|-----------|-------|
| **Path** | `https://identitytoolkit.googleapis.com/*` |
| **Method** | POST |
| **Threshold** | 10 requests |
| **Period** | 1 minuto |
| **Action** | Block (429) |

### 5. Firestore REST API
| Parâmetro | Valor |
|-----------|-------|
| **Path** | `https://firestore.googleapis.com/*` |
| **Method** | ALL |
| **Threshold** | 50 requests |
| **Period** | 1 minuto |
| **Action** | Block (429) |

### 6. API Externa (Brapi)
| Parâmetro | Valor |
|-----------|-------|
| **Path** | `https://api.brapi.com.br/*` |
| **Method** | GET |
| **Threshold** | 60 requests |
| **Period** | 1 minuto |
| **Action** | Challenge |

---

## 🔧 Configuração via Cloudflare Dashboard

### Via API (Terraform/Script)
```bash
# Exemplo via Cloudflare API
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/rate_limits" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Login rate limit",
    "disabled": false,
    "match": {
      "request": {
        "methods": ["POST"],
        "schemes": ["HTTPS"],
        "url": "carteira-investimentos-delta.vercel.app/auth/*"
      },
      "response": {
        "statuses": [429],
        "origin_traffic": true
      }
    },
    "threshold": 5,
    "period": 60,
    "action": {
      "mode": "block",
      "response": {
        "content_type": "application/json",
        "body": "{\"error\": \"Too many login attempts. Try again later.\"}"
      }
    }
  }'
```

---

## ⚠️ Considerações para Aplicação Estática (Vercel)

Como a aplicação é estática (Vercel) e usa Firebase diretamente do cliente:

1. **Rate limiting no Cloudflare** protege o edge, mas o Firebase tem seus próprios limites
2. **Client-side throttling** já implementado no `v250-runtime.js` (`duplicateRequestCount`)
3. **Cloudflare WAF** pode adicionar regras gerais (OWASP Top 10)

### Regras WAF Recomendadas (Cloudflare Managed Ruleset)
| Rule ID | Descrição | Ação |
|---------|-----------|------|
| 100015 | SQL Injection | Block |
| 100016 | XSS | Block |
| 100017 | RCE | Block |
| 100018 | LFI/RFI | Block |
| 100019 | PHP Injection | Block |

---

## 📊 Monitoramento

### Métricas a Acompanhar
| Métrica | Alerta |
|---------|--------|
| `rate_limit.blocked` | > 100/min |
| `rate_limit.challenged` | > 500/min |
| `http_requests.429` | Spike > 50% |

### Dashboard Cloudflare
- Security > Rate Limiting > Analytics
- Security > WAF > Events
- Analytics > Security > Rate Limiting

---

## ✅ Checklist de Implementação

| Item | Status |
|------|--------|
| Rate limits de login criados | ⏳ Pendente (requer acesso Cloudflare) |
| Rate limits de escrita criados | ⏳ Pendente |
| Rate limits de leitura criados | ⏳ Pendente |
| WAF Managed Ruleset ativado | ⏳ Pendente |
| Alertas configurados | ⏳ Pendente |
| Documentação no runbook | ✅ Este documento |

---

## 📝 Próximos Passos

1. Acessar Cloudflare Dashboard do projeto
2. Criar as 6 regras de rate limiting acima
3. Ativar WAF Managed Ruleset (OWASP Top 10)
4. Configurar alertas no Cloudflare
5. Testar com carga simulada (k6/hey)
5. Documentar no runbook de incidentes

---

**RESPONSÁVEL:** Hermes Agent (M1567)  
**DATA:** 2026-10-25  
**PRÓXIMO:** M1568 — Observatory Scan
