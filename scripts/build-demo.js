// Gera a versão DEMONSTRATIVA do index.html (fail closed).
// Uso: node scripts/build-demo.js  (executado somente na build do Preview demonstrativo).
// Qualquer padrão não encontrado aborta a build: nunca cai de volta para o Firebase real.
'use strict';
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(file, 'utf8');

const replacements = [
  // 1. Modo de teste sintético sempre ativo; ignora host e parâmetros da URL.
  { from: "const testMode=trustedQaRuntime && loopbackHost && params.get('testMode')==='1';", to: 'const testMode=true; /* DEMO_BUILD */', count: 1 },
  // 2. Somente leitura: nenhuma gravação ou sincronização.
  { from: "const testReadOnly=testMode && params.get('testReadOnly')==='1';", to: 'const testReadOnly=true; /* DEMO_BUILD */', count: 1 },
  // 3. Emuladores nunca habilitados na demo.
  { from: "const emulatorRequested=loopbackHost && (params.has('qaAuthEmulator') || params.has('qaFirestoreEmulator'));", to: 'const emulatorRequested=false; /* DEMO_BUILD */', count: 1 },
  // 4. Recuperação local desligada.
  { from: "const authoritativeLocalRecovery=(location.hostname==='localhost' || location.hostname==='127.0.0.1') && new URLSearchParams(location.search).get('authoritativeLocalRecovery')==='1';", to: 'const authoritativeLocalRecovery=false; /* DEMO_BUILD */', count: 1 },
  // 6. Identificação visual de demonstração.
  { from: '<title>📈 Carteira de Investimentos</title>', to: '<title>📈 Carteira de Investimentos — DEMONSTRAÇÃO</title>', count: 1 },
  { from: 'TESTE LOCAL', to: 'DEMONSTRAÇÃO', count: 2 },
];

for (const r of replacements) {
  const n = html.split(r.from).length - 1;
  if (n !== r.count) {
    console.error(`build-demo: padrão esperado ${r.count}x, encontrado ${n}x: ${r.from.slice(0, 80)}`);
    process.exit(1); // fail closed
  }
  html = html.split(r.from).join(r.to);
}

// 5. Remove o bloco inteiro que carrega os SDKs Firebase.
const fbStart = "(()=>{if(window.__LOCAL_TEST_MODE__) return;";
const fbIdx = html.indexOf(fbStart);
const fbEnd = fbIdx >= 0 ? html.indexOf('})();', fbIdx) : -1;
if (fbIdx < 0 || fbEnd < 0) { console.error('build-demo: bloco de SDK Firebase não encontrado'); process.exit(1); }
const fbBlock = html.slice(fbIdx, fbEnd + 5);
if (!fbBlock.includes('firebase-app-compat.js')) { console.error('build-demo: bloco inesperado'); process.exit(1); }
html = html.slice(0, fbIdx) + '/* DEMO_BUILD: SDKs Firebase removidos */' + html.slice(fbEnd + 5);

// Verificação final: nenhuma inicialização Firebase real pode restar no bloco de demo.
const forbidden = ['firebase-app-compat.js', 'firebase-auth-compat.js', 'firebase-firestore-compat.js'];
const leftover = forbidden.filter(f => html.includes(f));
if (leftover.length) {
  console.error('build-demo: SDK Firebase ainda referenciado: ' + leftover.join(', '));
  process.exit(1);
}

fs.writeFileSync(file, html);
console.log(`build-demo: OK (${replacements.length} regras aplicadas; SDKs Firebase removidos do fluxo).`);
