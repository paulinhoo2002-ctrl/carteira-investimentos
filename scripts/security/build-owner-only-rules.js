'use strict';
// SM173.3 — gera as Security Rules owner-only para UM ambiente Firebase.
// Não grava UID no repositório: o UID do proprietário vem de variável de ambiente.
// Uso: OWNER_UID=<uid> node scripts/security/build-owner-only-rules.js --project carteira-homolog-sm118 --out <arquivo>
const fs = require('node:fs');

// Mapa explícito de ambientes permitidos. Produção NÃO está aqui: o gerador recusa.
const ALLOWED_PROJECTS = Object.freeze({
  'carteira-homolog-sm118': Object.freeze({ env: 'QA' }),
});
const REFUSED_PROJECTS = Object.freeze(['carteira-de-investimento-16725']); // produção (.firebaserc) — proibido aqui.

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 2) out[argv[i].replace(/^--/, '')] = argv[i + 1];
  return out;
}

function buildRules({ projectId, ownerUid }) {
  if (!/^[A-Za-z0-9]{20,40}$/.test(ownerUid || '')) throw new Error('OWNER_UID ausente ou com formato inválido');
  const env = ALLOWED_PROJECTS[projectId]?.env;
  if (!env) throw new Error(`projeto não permitido pelo gerador: ${projectId}`);
  return [
    `// GERADO por scripts/security/build-owner-only-rules.js — ambiente ${env} — projeto ${projectId}.`,
    '// NÃO versionar com UID de outro ambiente. Regenerar a cada ambiente.',
    "rules_version = '2';",
    '',
    'service cloud.firestore {',
    '  match /databases/{database}/documents {',
    '    // Owner-only: uma conta proprietária, e-mail verificado, UID do próprio projeto.',
    '    function isOwnerAccount() {',
    '      return request.auth != null',
    `        && request.auth.uid == "${ownerUid}"`,
    '        && request.auth.token.email_verified == true;',
    '    }',
    '',
    '    match /portfolios/{userId} {',
    '      allow read, write: if isOwnerAccount() && userId == request.auth.uid;',
    '    }',
    '',
    '    match /users/{userId} {',
    '      allow read, write: if isOwnerAccount() && userId == request.auth.uid;',
    '    }',
    '',
    '    match /meta/access {',
    '      allow read, write: if isOwnerAccount();',
    '    }',
    '',
    '    // Sem regra genérica: subcoleções e demais caminhos ficam negados por padrão.',
    '  }',
    '}',
    '',
  ].join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectId = args.project;
  if (!projectId) throw new Error('uso: --project <id> --out <arquivo>');
  if (REFUSED_PROJECTS.includes(projectId)) throw new Error('RECUSADO: projeto de produção não é alvo deste gerador');
  if (!args.out) throw new Error('informe --out');
  const text = buildRules({ projectId, ownerUid: process.env.OWNER_UID });
  fs.writeFileSync(args.out, text, 'utf8');
  console.log(`OK ${args.out} (projeto ${projectId})`);
}

if (require.main === module) {
  try { main(); } catch (e) { console.error('FALHA:', e.message); process.exit(1); }
}

module.exports = { buildRules, ALLOWED_PROJECTS, REFUSED_PROJECTS };
