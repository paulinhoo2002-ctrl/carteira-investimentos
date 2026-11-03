# Release Automation — M1581–M1590
**Data:** 2026-10-25  
**Projeto:** Carteira de Investimentos LEGACY  
**Branch:** feat/financial-evolution-premium

---

## Objetivo
Automatizar completamente o processo de release: versionamento, changelog, tags, deploy preview, validacao e rollback.

---

## Missoes

| Missao | Foco | Entregavel |
|--------|------|------------|
| M1581 | Semantic Release | semantic-release + conventional commits |
| M1582 | Changelog Automatico | auto-changelog / standard-version |
| M1583 | Version Bumping | patch/minor/major baseado em commit type |
| M1584 | Git Tags Automatizados | v{major}.{minor}.{patch} |
| M1585 | GitHub Actions CI/CD | lint, test, build, audit, deploy preview |
| M1586 | Vercel Preview Deploy | Auto-deploy PRs com URL unica |
| M1587 | Release Notes Template | breaking changes, features, fixes, deps |
| M1588 | Rollback Automatizado | git revert + deploy anterior em <5min |
| M1589 | Branch Protection | required checks, code review, linear history |
| M1590 | Release Checklist Automatizado | gates visuais, testes, audit, SBOM |

---

## Implementacao

### 1. Semantic Release Config
Arquivo: .releaserc.json
```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/npm",
    "@semantic-release/git",
    "@semantic-release/github"
  ],
  "commitAnalyzerOpts": { "preset": "conventionalcommits" },
  "releaseNotesGeneratorOpts": { "preset": "conventionalcommits" },
  "changelogOpts": { "changelogFile": "CHANGELOG.md" }
}
```

### 2. Commit Message Convention
Tipos permitidos:
- feat: Nova funcionalidade -> MINOR
- fix: Correcao de bug -> PATCH
- docs: Documentacao -> PATCH
- style: Formatacao -> PATCH
- refactor: Refatoracao -> PATCH
- perf: Performance -> PATCH
- test: Testes -> PATCH
- chore: Manutencao -> PATCH
- ci: CI/CD -> PATCH
- build: Build system -> PATCH
- revert: Revert -> PATCH

Breaking change: feat! ou fix! -> MAJOR

### 3. Release Notes Template
Arquivo: .github/release-template.md
```markdown
## Release v{version}

### Breaking Changes
- [ ] Nenhum

### Features
- [ ] Nova funcionalidade

### Fixes
- [ ] Correcao de bug

### Dependencies
- [ ] Atualizacao de dependencia

### Chores
- [ ] Manutencao

### Changelog
Ver CHANGELOG.md

### Checklist
- [ ] Todos os testes passam
- [ ] Auditoria de dependencias OK
- [ ] SBOM atualizado
- [ ] Deploy preview validado
- [ ] Rollback testado
```

### 3. CI/CD Pipeline
Arquivo: .github/workflows/release.yml
```yaml
name: Release
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: write
  issues: write
  pull-requests: write

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Run security regression tests
        run: node --test tests/security-regression.test.js

      - name: Build
        run: npm run build && npm run build:modern

      - name: Semantic Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
        run: npx semantic-release
```

### 4. Vercel Preview Deploy
Arquivo: .github/workflows/preview.yml
```yaml
name: Preview Deploy
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build && npm run build:modern
      - uses: amondnet/vercel-action@v25
        if: ${{ github.event_name == 'pull_request' }}
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod=false'
```

### 5. Rollback Script
Arquivo: scripts/rollback.sh
```bash
#!/bin/bash
set -e

echo "Iniciando rollback..."

LAST_TAG=$(git tag -l "v*" --sort=-v:refname | head -1)
echo "Ultima tag: $LAST_TAG"

CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "Rollback deve ser executado na branch main"
    exit 1
fi

ROLLBACK_BRANCH="rollback/$(date +%Y%m%d-%H%M%S)"
git checkout -b "$ROLLBACK_BRANCH"
git reset --hard "$LAST_TAG"
git push origin "$ROLLBACK_BRANCH:main" --force-with-lease

echo "Rollback para $LAST_TAG iniciado"
echo "Monitorar deploy em: https://vercel.com/dashboard"
```

### 6. Branch Protection Rules
Configuracao via GitHub Settings > Branches > main:
- Required status checks: Dependency Check, Build and test, Security Regression Tests, Visual Regression
- Required PR reviews: 1 approval, dismiss stale, require code owners
- Require linear history: true
- Allow force pushes: false
- Allow deletions: false
- Require conversation resolution: true

### 6. Release Checklist Automatizado
Arquivo: scripts/release-checklist.js
```javascript
const checks = [
  { name: 'All tests pass', cmd: 'npm test' },
  { name: 'Security regression tests', cmd: 'node --test tests/security-regression.test.js' },
  { name: 'Dependency audit', cmd: 'npm run audit:ci' },
  { name: 'Package lock valid', cmd: 'npm run check:lock' },
  { name: 'Build succeeds', cmd: 'npm run build && npm run build:modern' },
  { name: 'SBOM generated', cmd: 'test -f sbom.json' },
  { name: 'CHANGELOG updated', cmd: 'git diff HEAD~1 CHANGELOG.md' },
  { name: 'No uncommitted changes', cmd: 'git status --porcelain' },
];

async function runChecks() {
  for (const check of checks) {
    console.log(check.name + '...');
    try {
      await execAsync(check.cmd);
      console.log('OK ' + check.name);
    } catch (e) {
      console.error('FALHOU ' + check.name);
      process.exit(1);
    }
  }
  console.log('Todos os checks passaram!');
}
runChecks();
```

---

## Arquivos a Criar

```
.releaserc.json
.github/
  release-template.md
  workflows/
    release.yml
    preview.yml
scripts/
  rollback.sh
  release-checklist.js
  verify-release.sh
```

---

## Proximos Passos

1. Instalar dependencias: npm i -D semantic-release @semantic-release/*
2. Criar arquivos de config acima
3. Configurar secrets no GitHub (NPM_TOKEN, VERCEL_TOKEN, etc.)
4. Testar em branch release/test
5. Ativar branch protection no GitHub
5. Documentar no README
5. Proximo: M1591-M1600 Disaster Recovery

---

## Arquivos Relacionados

| Arquivo | Descricao |
|---------|-----------|
| .releaserc.json | Config semantic-release |
| .github/workflows/release.yml | Pipeline release |
| .github/workflows/preview.yml | Deploy preview |
| scripts/rollback.sh | Script rollback |
| scripts/release-checklist.js | Checklist automatizado |
| CHANGELOG.md | Changelog (gerado automaticamente) |

---

RESPONSAVEL: Hermes Agent (M1581-M1590)
DATA: 2026-10-25
PROXIMO: M1591-M1600 Disaster Recovery