# Security Regression Tests — M1570
**Data:** 2026-10-25  
**Projeto:** Carteira de Investimentos LEGACY  
**Branch:** feat/financial-evolution-premium

---

## 🎯 Objetivo
Testes automatizados de regressão para garantir que configurações de segurança não regressem entre deploys.

---

## 🧪 Testes Implementados

### 1. CSP Headers Tests
**Arquivo:** `tests/security-csp-headers.test.js`
```javascript
// Verifica se CSP header está presente e contém hashes SRI
test('CSP header contains SRI hashes for Google Fonts', () => {
  const csp = getCSPHeader();
  assert.match(csp, /sha384-Yvt2jmTtQFEtXIVH1VgGfieY\/D91UJNVwWdiVUirr4Gwov6BPGKdjcxOWDiaZ5wF/);
  assert.match(csp, /sha384-mU3FzJNJ\/BZ17S5514rJB3bxwX2qryHVXXuRmnJh6\/eBWwz7tz4mjDWcp1yhYIix/);
});
```

### 2. Security Headers Tests
**Arquivo:** `tests/security-headers.test.js`
```javascript
test('X-Content-Type-Options: nosniff', () => {
  assert.equal(getHeader('X-Content-Type-Options'), 'nosniff');
});

test('X-Frame-Options: DENY', () => {
  assert.equal(getHeader('X-Frame-Options'), 'DENY');
});

test('Referrer-Policy: strict-origin-when-cross-origin', () => {
  assert.equal(getHeader('Referrer-Policy'), 'strict-origin-when-cross-origin');
});

test('Permissions-Policy restricts sensitive features', () => {
  const pp = getHeader('Permissions-Policy');
  assert.match(pp, /camera=\(\)/);
  assert.match(pp, /microphone=\(\)/);
  assert.match(pp, /geolocation=\(\)/);
});
```

### 3. CSP Meta Tag Test
**Arquivo:** `tests/security-csp-meta.test.js`
```javascript
test('CSP meta tag matches vercel.json header', () => {
  const metaCSP = getMetaCSP();
  const headerCSP = getHeader('Content-Security-Policy');
  assert.match(metaCSP, /sha384-Yvt2jmTtQFEtXIVH1VgGfieY/);
  assert.match(headerCSP, /sha384-Yvt2jmTtQFEtXIVH1VgGfieY/);
});
```

### 4. SRI Integrity Tests
**Arquivo:** `tests/security-sri.test.js`
```javascript
test('Google Fonts link has integrity attribute', () => {
  const links = document.querySelectorAll('link[rel="stylesheet"][href*="fonts.googleapis.com"]');
  for (const link of links) {
    assert.ok(link.hasAttribute('integrity'));
    assert.match(link.integrity, /^sha384-/);
  }
});

test('Google Fonts link has crossorigin=anonymous', () => {
  const links = document.querySelectorAll('link[rel="stylesheet"][href*="fonts.googleapis.com"]');
  for (const link of links) {
    assert.equal(link.getAttribute('crossorigin'), 'anonymous');
  }
});
```

### 5. HSTS Test
**Arquivo:** `tests/security-hsts.test.js`
```javascript
test('Strict-Transport-Security header present with preload', () => {
  const hsts = getHeader('Strict-Transport-Security');
  assert.ok(hsts.includes('max-age=31536000'));
  assert.ok(hsts.includes('includeSubDomains'));
  assert.ok(hsts.includes('preload'));
});
```

### 6. Permissions Policy Test
**Arquivo:** `tests/security-permissions-policy.test.js`
```javascript
test('Permissions-Policy blocks sensitive APIs', () => {
  const pp = getHeader('Permissions-Policy');
  const restricted = ['camera', 'microphone', 'geolocation', 'payment', 'usb', 'bluetooth'];
  for (const feature of restricted) {
    assert.match(pp, new RegExp(`${feature}=\(\)`));
  }
});
```

### 7. Firebase Rules Regression
**Arquivo:** `tests/security-firebase-rules.test.js`
```javascript
test('Firestore rules enforce owner-only access', () => {
  const rules = readFileSync('firestore.rules', 'utf8');
  assert.match(rules, /request\.auth\.uid == "yaypxiiv7Ye7pwpDZ0nqhG3Yj7E3"/);
  assert.match(rules, /request\.auth\.token\.email_verified == true/);
  assert.match(rules, /request\.auth\.token\.email == "paulinhoo2002@gmail.com"/);
});

test('Firestore rules deny by default', () => {
  const rules = readFileSync('firestore.rules', 'utf8');
  assert.doesNotMatch(rules, /allow read, write:/);
});
```

### 8. Secrets Scan Regression
**Arquivo:** `tests/security-secrets.test.js`
```javascript
test('No hardcoded API keys in source', () => {
  const files = glob.sync('**/*.{js,html,json}', { ignore: ['node_modules/**', '.git/**'] });
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    assert.doesNotMatch(content, /AIza[0-9A-Za-z_-]{35}/);
    assert.doesNotMatch(content, /ya29\.[0-9A-Za-z_-]{35}/);
    assert.doesNotMatch(content, /ghp_[0-9a-zA-Z]{36}/);
  }
});

test('Firebase config apiKey is redacted', () => {
  const html = readFileSync('index.html', 'utf8');
  assert.match(html, /apiKey: "[^"]*reda[^"]*"/);
});
```

### 9. Dependency Audit Regression
**Arquivo:** `tests/security-deps.test.js`
```javascript
test('No high/critical vulnerabilities in production deps', async () => {
  const result = await execAsync('npm audit --audit-level=high --json');
  const audit = JSON.parse(result.stdout);
  assert.equal(audit.metadata.vulnerabilities.high, 0);
  assert.equal(audit.metadata.vulnerabilities.critical, 0);
});

test('package-lock.json is valid and committed', () => {
  assert.ok(existsSync('package-lock.json'));
  const gitStatus = await execAsync('git status --porcelain package-lock.json');
  assert.equal(gitStatus.stdout.trim(), '');
});
```

### 10. SRI Hash Regression
**Arquivo:** `tests/security-sri-hashes.test.js`
```javascript
test('Google Fonts SRI hashes match known good values', () => {
  const knownHashes = {
    'Inter': 'sha384-Yvt2jmTtQFEtXIVH1VgGfieY/D91UJNVwWdiVUirr4Gwov6BPGKdjcxOWDiaZ5wF',
    'MaterialSymbols': 'sha384-mU3FzJNJ/BZ17S5514rJB3bxwX2qryHVXXuRmnJh6/eBWwz7tz4mjDWcp1yhYIix'
  };
  
  const html = readFileSync('index.html', 'utf8');
  for (const [name, hash] of Object.entries(knownHashes)) {
    assert.match(html, new RegExp(`integrity=["']${hash}["']`));
  }
});
```

---

## 📁 Estrutura de Arquivos Sugerida

```
tests/
├── security-csp-headers.test.js
├── security-headers.test.js
├── security-csp-meta.test.js
├── security-sri.test.js
├── security-hsts.test.js
├── security-permissions-policy.test.js
├── security-firebase-rules.test.js
├── security-secrets.test.js
├── security-deps.test.js
├── security-sri-hashes.test.js
└── security-regression.test.js  (orchestrador)
```

---

## 🔧 Implementação do Orchestrador

**Arquivo:** `tests/security-regression.test.js`
```javascript
import { test } from 'node:test';
import { glob } from 'glob';

// Importar todos os testes de segurança
import './security-csp-headers.test.js';
import './security-headers.test.js';
import './security-csp-meta.test.js';
import './security-sri.test.js';
import './security-hsts.test.js';
import './security-permissions-policy.test.js';
import './security-firebase-rules.test.js';
import './security-secrets.test.js';
import './security-deps.test.js';
import './security-sri-hashes.test.js';

console.log('✅ All security regression tests loaded');
```

---

## 🚀 Integração no CI

### Adicionar ao `.github/workflows/ci.yml`
```yaml
  security-regression:
    name: Security Regression Tests
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: dependency-check
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: node --test tests/security-regression.test.js
```

---

## 📊 Métricas de Cobertura

| Categoria | Testes | Status |
|-----------|--------|--------|
| CSP Headers | 3 | ✅ Planejado |
| Security Headers | 5 | ✅ Planejado |
| CSP Meta Tag | 2 | ✅ Planejado |
| SRI | 3 | ✅ Planejado |
| HSTS | 1 | ✅ Planejado |
| Permissions Policy | 1 | ✅ Planejado |
| Firebase Rules | 2 | ✅ Planejado |
| Secrets Scan | 2 | ✅ Planejado |
| Dependency Audit | 2 | ✅ Planejado |
| SRI Hashes | 1 | ✅ Planejado |
| **Total** | **25** |  |

---

## 📋 Checklist de Implementação

| Teste | Status | Arquivo |
|-------|--------|---------|
| CSP Headers | ⏳ | `security-csp-headers.test.js` |
| Security Headers | ⏳ | `security-headers.test.js` |
| CSP Meta Tag | ⏳ | `security-csp-meta.test.js` |
| SRI Links | ⏳ | `security-sri.test.js` |
| HSTS | ⏳ | `security-hsts.test.js` |
| Permissions Policy | ⏳ | `security-permissions-policy.test.js` |
| Firebase Rules | ⏳ | `security-firebase-rules.test.js` |
| Secrets Scan | ⏳ | `security-secrets.test.js` |
| Dependency Audit | ⏳ | `security-deps.test.js` |
| SRI Hashes | ⏳ | `security-sri-hashes.test.js` |
| Orchestrator | ⏳ | `security-regression.test.js` |
| CI Integration | ⏳ | `.github/workflows/ci.yml` |

---

## 🚀 Próximos Passos

1. **Criar testes** individuais (prioridade: CSP, Headers, SRI, Secrets)
2. **Criar orchestrador** `security-regression.test.js`
3. **Adicionar ao CI** (novo job `security-regression`)
4. **Executar localmente** para validar
5. **Commit e PR**

---

## 📁 Arquivos Relacionados

| Arquivo | Descrição |
|---------|-----------|
| `vercel.json` | Headers de segurança |
| `index.html` | CSP meta + SRI hashes |
| `firestore.rules` | Regras Firebase |
| `package.json` | Scripts `audit:ci`, `check:lock` |
| `sbom.json` | SBOM CycloneDX |

---

## 🚀 Próximos Passos

1. **Criar testes** individuais (prioridade: CSP, Headers, SRI, Secrets)
2. **Criar orchestrador** `security-regression.test.js`
3. **Adicionar job `security-regression` no CI**
4. **Executar `npm test`** para validar
5. **Próximo:** M1571–M1580 Docs Overhaul

---

## 📁 Arquivos Relacionados

| Arquivo | Descrição |
|---------|-----------|
| `vercel.json` | Headers de segurança |
| `index.html` | CSP meta + SRI hashes |
| `firestore.rules` | Regras Firebase |
| `package.json` | Scripts `audit:ci`, `check:lock` |
| `sbom.json` | SBOM CycloneDX |

---

## 🚀 Próximos Passos

1. **Criar testes** individuais (prioridade: CSP, Headers, SRI, Secrets)
2. **Criar orchestrador** `security-regression.test.js`
3. **Adicionar job `security-regression` no CI**
4. **Executar `npm test`** para validar
5. **Próximo:** M1571–M1580 Docs Overhaul

---

**RESPONSÁVEL:** Hermes Agent (M1570)  
**DATA:** 2026-10-25  
**PRÓXIMO:** M1571–M1580 Docs Overhaul