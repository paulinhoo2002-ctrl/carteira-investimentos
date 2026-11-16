#!/usr/bin/env node
'use strict';
// SM173.10B — materializa, SOMENTE durante o build de preview QA, o arquivo temporário de regras Owner-Only.
// A origem é a variável HOMOLOG_QA_RULES_B64 (Base64 é transporte, não criptografia). O conteúdo é validado por
// SHA-256 contra a referência aprovada antes de gravar. Nunca imprime o conteúdo. O arquivo não é versionado.
// Uso: node scripts/homolog/materialize-qa-rules.js <destino-temporario>
const fs = require('node:fs');
const { QA_RULES_SHA256, sha256 } = require('./guard');

function fail(message) {
  throw new Error(message);
}

function materialize(destination, base64) {
  if (!destination) fail('destino não informado');
  if (!base64) fail('HOMOLOG_QA_RULES_B64 ausente');
  const buffer = Buffer.from(base64, 'base64');
  if (sha256(buffer) !== QA_RULES_SHA256) fail('SHA-256 das regras diverge da referência aprovada (conteúdo não exibido)');
  if (fs.existsSync(destination)) fail('destino já existe: não sobrescreve');
  fs.writeFileSync(destination, buffer, { mode: 0o600, flag: 'wx' });
  return destination;
}

if (require.main === module) {
  try {
    materialize(process.argv[2], process.env.HOMOLOG_QA_RULES_B64 || '');
    console.log('regras QA temporárias materializadas (SHA-256 conferido)');
  } catch (error) {
    console.error(`MATERIALIZE-QA-RULES: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { materialize };
