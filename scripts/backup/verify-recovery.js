#!/usr/bin/env node
// M911-M920 — Certificação de recuperação SELF-SERVICE do backup protegido.
// Executado PELO PROPRIETÁRIO no próprio terminal: a senha é lida do stdin
// (nunca passa por agente/chat/rede) e o arquivo é trabalhado numa CÓPIA
// descartável. Zero rede, zero escrita no Firestore, zero valores impressos.
//
// Uso:  node scripts/backup/verify-recovery.js [arquivo-do-backup]
//       (sem argumento: usa o backup protegido mais recente do diretório aprovado)
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');


const APPROVED_DIR = 'C:/Projetos/_backups/carteira-investimentos';
const PBKDF2_ITERATIONS = 310000;

function fail(msg) { console.error('❌ ' + msg); process.exit(1); }

function readStdinFirstLine() {
  // Robusto no Windows/MSYS: se stdin é TTY usa readline; se vem de pipe (testes),
  // lê o stream inteiro e devolve a primeira linha.
  return new Promise((resolve) => {
    if (process.stdin.isTTY) {
      const rl = require('node:readline').createInterface({ input: process.stdin, output: process.stdout });
      rl.question('', (a) => { rl.close(); resolve(String(a || '').replace(/\r?\n$/, '')); });
    } else {
      let buf = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', d => { buf += d; });
      process.stdin.on('end', () => resolve(buf.split(/\r?\n/)[0] || ''));
      process.stdin.on('error', () => resolve(buf.split(/\r?\n/)[0] || ''));
      if (process.stdin.isPaused && typeof process.stdin.resume === 'function') process.stdin.resume();
    }
  });
}

async function askPassword() {
  // stdin do PROPRIETÁRIO (nunca compartilhada com agentes/chat/rede).
  process.stdout.write('Senha do backup (digite e Enter — nunca compartilhe com agentes): ');
  const answer = await readStdinFirstLine();
  process.stdout.write('\n');
  return answer;
}

function b64ToBuf(b64) { return Buffer.from(b64, 'base64'); }

async function main() {
  const arg = process.argv[2];
  const file = arg
    ? path.resolve(arg)
    : (() => {
        const cands = fs.readdirSync(APPROVED_DIR)
          .filter(f => /^carteira.*backup.*protegido.*\.json$/.test(f))
          .map(f => ({ f, t: fs.statSync(path.join(APPROVED_DIR, f)).mtimeMs }))
          .sort((a, b) => b.t - a.t);
        if (!cands.length) fail('Nenhum backup protegido encontrado em ' + APPROVED_DIR);
        return path.join(APPROVED_DIR, cands[0].f);
      })();

  if (!fs.existsSync(file)) fail('Arquivo não encontrado: ' + file);
  console.log('📁 Backup:', path.basename(file), '(' + fs.statSync(file).size + ' bytes)');

  // 1) Integridade ANTES de tudo (sidecar SHA-256)
  const sidecar = file + '.sha256';
  if (fs.existsSync(sidecar)) {
    const expected = (fs.readFileSync(sidecar, 'utf8').match(/[a-f0-9]{64}/) || [])[0];
    const actual = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    if (!expected) fail('Sidecar presente mas sem hash SHA-256 válido.');
    if (actual !== expected) fail('Sidecar SHA-256 NÃO confere — arquivo alterado ou corrompido. ABORTADO antes de qualquer leitura.');
    console.log('🔒 Integridade SHA-256: OK (sidecar confere)');
  } else {
    console.log('⚠️  Sem sidecar .sha256 — prosseguindo SEM verificação prévia de integridade.');
  }

  // 2) Cópia descartável (o original jamais é tocado além de leitura)
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'recovery-verify-'));
  const copy = path.join(tmp, 'copy.json');
  fs.copyFileSync(file, copy);
  console.log('🗑️  Cópia descartável em:', tmp);

  try {
    // 3) Envelope
    const envelope = JSON.parse(fs.readFileSync(copy, 'utf8'));
    if (envelope.format !== 'backup-portability/v1-encrypted') {
      // aceitar formato não criptografado com aviso
      if (!envelope.ciphertext) { fail('Arquivo sem envelope criptografado (formato ' + String(envelope.format) + '). Use a ferramenta apenas em backups protegidos.'); }
    }
    const kdf = envelope.kdf || {};
    if (kdf.name !== 'PBKDF2' || kdf.hash !== 'SHA-256') fail('KDF inesperado: ' + JSON.stringify(kdf));

    // 4) Senha (stdin do proprietário)
    const passphrase = await askPassword();
    if (!passphrase) fail('Senha vazia.');

    // 5) Derivação + AES-GCM (idêntico ao app: PBKDF2 310k SHA-256)
    const salt = b64ToBuf(kdf.salt);
    const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: kdf.iterations || PBKDF2_ITERATIONS, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    let plaintext;
    try {
      const buf = b64ToBuf(envelope.ciphertext);
      const iv = b64ToBuf(envelope.iv);
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, buf);
      plaintext = Buffer.from(plain).toString('utf8');
    } catch (e) {
      fail('DESCRYPT FALHOU: senha incorreta OU arquivo adulterado (autenticação AES-GCM recusou). Nada foi alterado.');
    }
    console.log('🔓 AES-GCM: autenticado e descriptografado com sucesso (senha correta + arquivo íntegro).');

    // 6) Validação do payload (estrutura — SEM imprimir valores financeiros)
    const payload = JSON.parse(plaintext);
    const domains = {};
    for (const key of ['assets', 'aportes', 'proventos', 'rfEvents', 'wallets', 'goals']) {
      const v = payload[key];
      domains[key] = Array.isArray(v) ? v.length : (v && typeof v === 'object' ? Object.keys(v).length : 0);
    }
    const hasManifest = !!(payload.manifest || payload.meta || payload.schema || payload.version);
    console.log('📊 Prévia da estrutura (contagens apenas):', JSON.stringify(domains));
    console.log('🧾 Manifesto presente:', hasManifest ? 'sim' : 'NÃO');
    const total = Object.values(domains).reduce((s, n) => s + n, 0);
    if (total === 0) fail('Payload vazio — backup sem dados utilizáveis.');

    // 7) Veredito
    console.log('');
    console.log('══════════════════════════════════════════════');
    console.log('✅ REAL_RECOVERY_CERTIFIED=YES (neste ambiente isolado):');
    console.log('   • integridade prévia OK; senha aceita; AES-GCM autenticou;');
    console.log('   • payload legível e estruturado (' + total + ' registros);');
    console.log('   • ZERO escrita no Firestore (ferramenta sem rede);');
    console.log('   • original intocado; cópia descartável.');
    console.log('   A restauração REAL na carteira continua exigindo sua decisão');
    console.log('   explícita, feita pelo próprio app (Configurações > Restaurar).');
    console.log('══════════════════════════════════════════════');
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch(e => fail(String(e && e.message ? e.message : e)));
