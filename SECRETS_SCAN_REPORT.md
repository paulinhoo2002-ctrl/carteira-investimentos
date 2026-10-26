# Secrets Scan Report — M1564
**Data:** 2026-10-25  
**Projeto:** Carteira de Investimentos LEGACY  
**Branch:** feat/financial-evolution-premium  
**Ferramentas:** Grep manual + padrões regex (trufflehog/git-secrets indisponíveis no ambiente)

---

## 📋 Resumo Executivo

| Critério | Status | Detalhes |
|----------|--------|----------|
| **API Keys hardcoded** | ✅ LIMPO | Apenas placeholders (`«reda...»`, `demo-...or`) |
| **Firebase Config** | ✅ SEGURO | apiKey redatado; valores públicos apenas |
| **Passwords/Secrets** | ✅ LIMPO | Apenas em testes (fixtures sintéticos) |
| **Private Keys** | ✅ LIMPO | Nenhuma encontrada |
| **Tokens/Access Keys** | ✅ LIMPO | Apenas em padrões de detecção (backup-portability.js) |

---

## 🔍 Metodologia

Busca manual via `grep -r` com padrões regex para:
- Google API Keys (`AIza...`)
- Firebase Auth Tokens (`ya29.`)
- AWS/GCP Keys (`sk-`, `ghp_`, `github_pat_`)
- Private Keys (`-----BEGIN PRIVATE KEY-----`)
- Passwords hardcoded (`password:`, `secret:`)

---

## 📊 Resultados Detalhados

### 1. Firebase Configuration (`index.html:9122`)
```javascript
const firebaseConfig = {
  apiKey: "«reda...»",           // ← REDACTED (placeholder)
  authDomain: "carteira-de-investimento-16725.firebaseapp.com",  // público
  projectId: "carteira-de-investimento-16725",                   // público
  storageBucket: "carteira-de-investimento-16725.firebasestorage.app", // público
  messagingSenderId: "194762472851",                             // público
  appId: "1:194762472851:web:1285e351b2dcc80f147c66",           // público
  measurementId: "G-ZP045H8HTZ"                                  // público
};
```
**Status:** ✅ SEGURO — apiKey redatada; demais valores são configuração pública do Firebase.

### 2. Emulator Demo Mode (`index.html:11415`)
```javascript
const appConfig = emulatorMode
  ? {apiKey:'demo-...or'}  // ← DEMO PLACEHOLDER
  : firebaseConfig;
```
**Status:** ✅ SEGURO — apenas para modo emulador local.

### 3. Test Fixtures (Sintéticos)
| Arquivo | Padrão | Contexto |
|---------|--------|----------|
| `tests/auth-access-realtime.test.js` | `synthetic-${randomUUID()}` | Senhas de teste geradas dinamicamente |
| `tests/auth-access-security.test.js` | `synthetic-${randomUUID()}` | Senhas de teste geradas dinamicamente |

**Status:** ✅ SEGURO — fixtures sintéticos, não credenciais reais.

### 4. Backup Portability (`backup-portability.js`)
```javascript
const SENSITIVE_KEY = /(token|secret|password|passwd|credential|cookie|session|storage|authorization|access[_-]?key|refresh[_-]?token|private[_-]?key)/i;
```
**Status:** ✅ SEGURO — padrão de DETECÇÃO de chaves sensíveis, não segredo em si.

### 5. Backup Encryption UI (`index.html`)
```html
<input id="backup-encryption-passphrase" type="password" ...>
<input id="backup-encryption-confirm" type="password" ...>
```
**Status:** ✅ SEGURO — campos de input de usuário, não segredos hardcoded.

---

## 🔍 Varredura de Padrões Específicos

| Padrão | Encontrado | Local | Status |
|--------|------------|-------|--------|
| `AIza[0-9A-Za-z_-]{35}` | ❌ Não | — | ✅ LIMPO |
| `ya29\.[0-9A-Za-z_-]{35}` | ❌ Não | — | ✅ LIMPO |
| `sk-[0-9a-zA-Z]{48}` | ❌ Não | — | ✅ LIMPO |
| `ghp_[0-9a-zA-Z]{36}` | ❌ Não | — | ✅ LIMPO |
| `github_pat_[0-9a-zA-Z]{22}_[0-9a-zA-Z]{59}` | ❌ Não | — | ✅ LIMPO |
| `-----BEGIN PRIVATE KEY-----` | ❌ Não | — | ✅ LIMPO |
| `-----BEGIN RSA PRIVATE KEY-----` | ❌ Não | — | ✅ LIMPO |
| `password\s*[:=]\s*["'][^"']+["']` | ❌ Não (exceto testes) | Testes | ✅ SINTÉTICO |

---

## ✅ Conclusão

**STATUS: LIMPO — NENHUM SEGREDO REAL ENCONTRADO**

| Categoria | Status |
|-----------|--------|
| API Keys (Google/Firebase/AWS/GitHub) | ✅ LIMPO |
| Private Keys / Certificados | ✅ LIMPO |
| Passwords / Tokens hardcoded | ✅ LIMPO |
| Firebase Config | ✅ SEGURO (apiKey redatada) |
| Test Fixtures | ✅ SINTÉTICOS |
| Código de Detecção | ✅ FUNCIONAL (backup-portability.js) |

---

## 📝 Observações

1. **Firebase Config** — Apenas `apiKey` é sensível; está redatada. Os demais campos (projectId, authDomain, etc.) são públicos por design do Firebase.

2. **Testes** — Usam `synthetic-${randomUUID()}` para senhas, garantindo isolamento e não-reuso.

3. **Backup Portability** — O regex `SENSITIVE_KEY` é uma *feature de segurança* para detectar vazamentos, não um vazamento em si.

---

## 📁 Arquivos Relacionados

| Arquivo | Descrição |
|---------|-----------|
| `index.html:9122` | Firebase config (apiKey redatada) |
| `index.html:11415` | Demo mode placeholder |
| `tests/auth-access-*.test.js` | Fixtures sintéticos |
| `backup-portability.js` | Detector de chaves sensíveis |
| `firestore.rules` | Regras de segurança (auditado em M1563) |

---

## ✅ Conclusão

**STATUS: APROVADO — NENHUM SEGREDO REAL VAZADO NO REPOSITÓRIO**

---

**SCANNER:** Hermes Agent (M1564)  
**DATA:** 2026-10-25  
**PRÓXIMO:** M1565 — Dependency Pinning
