#!/bin/bash
# ATENÇÃO (M1766 — revisão de segurança):
# Este script força o histórico da main (reset --hard + push --force-with-lease).
# USO EXCLUSIVO DO OWNER, com autorização explícita, em emergência comprovada.
# Alternativa preferida e NÃO destrutiva: `vercel rollback <deployment-url>`
# (reverte o deploy sem tocar o histórico do Git).
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