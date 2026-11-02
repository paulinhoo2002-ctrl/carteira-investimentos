#!/bin/bash
# Disaster Recovery Drill Script
# Execute em ambiente de teste (nao producao)

set -e

echo "=== DISASTER RECOVERY DRILL ==="
echo "Data: $(date)"
echo ""

# Drill 1: Firestore Restore Test
echo "=== DRILL 1: Firestore Restore ==="
echo "1. Listando backups disponiveis..."
npm run backup:list 2>&1 | head -20

echo ""
echo "2. Identificando backup mais recente valido..."
LATEST_BACKUP=$(npm run backup:list 2>&1 | grep -E "^backup-" | head -1 | awk '{print $1}')
echo "Backup alvo: $LATEST_BACKUP"

if [ -z "$LATEST_BACKUP" ]; then
    echo "ERRO: Nenhum backup encontrado"
    exit 1
fi

echo ""
echo "3. Dry-run restore..."
npm run backup:restore --backup="$LATEST_BACKUP" --dry-run

echo ""
echo "4. Restore real (em projeto de teste)..."
echo "   ATENCAO: Executar apenas em projeto de teste!"
read -p "Continuar? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm run backup:restore --backup="$LATEST_BACKUP"
    echo "Restore concluido"
    
    echo ""
    echo "5. Validando integridade pos-restore..."
    npm run backup:verify --backup="$LATEST_BACKUP"
else
    echo "Pulado restore real (requer confirmacao)"
fi

# Drill 2: Vercel Rollback Test
echo ""
echo "=== DRILL 2: Vercel Rollback ==="
echo "Deployments recentes:"
vercel list --scope=paulinhoo2002-ctrl 2>&1 | head -10

echo ""
echo "Para testar rollback:"
echo "  vercel rollback <deployment-url> --token=\\$VERCEL_TOKEN"

# Drill 3: Git Rollback Test
echo ""
echo "=== DRILL 3: Git Rollback ==="
echo "Tags disponiveis:"
git tag -l "v*" --sort=-v:refname | head -5

echo ""
echo "Para testar rollback:"
echo "  git checkout -b rollback-test"
echo "  git reset --hard v<versao>"
echo "  git push origin rollback-test:main --force-with-lease"

echo ""
echo "=== DRILL COMPLETO ==="
echo "Documentar tempos RTO/RPO reais em DISASTER_RECOVERY_PLAN.md"
