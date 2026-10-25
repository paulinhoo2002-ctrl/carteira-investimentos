// M911-M920 — teste da ferramenta verify-recovery com backup SINTÉTICO (formato idêntico ao app).
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const TOOL = path.join(__dirname, '..', 'scripts', 'backup', 'verify-recovery.js');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'vrec-test-'));
const FILE = path.join(TMP, 'carteira-investimentos-backup-protegido-teste.json');
const PASS = 'senha-teste-123';
const wrongPassUsed = [];

async function makeBackup() {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(PASS), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const payload = JSON.stringify({ manifest: { v: 1 }, assets: [{ ticker: 'TEST4' }], aportes: [], proventos: [{ v: 1 }], rfEvents: [], wallets: [], goals: {} });
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(payload));
  const envelope = { format: 'backup-portability/v1-encrypted', version: 1, kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 310000, salt: salt.toString('base64') }, iv: iv.toString('base64'), ciphertext: Buffer.from(ct).toString('base64') };
  fs.writeFileSync(FILE, JSON.stringify(envelope));
  const sha = crypto.createHash('sha256').update(fs.readFileSync(FILE)).digest('hex');
  fs.writeFileSync(FILE + '.sha256', 'sha256=' + sha + '\n');
}

function run(password) {
  try {
    return execFileSync('node', [TOOL, FILE], { input: password + '\n', encoding: 'utf8', timeout: 60000 });
  } catch (e) {
    return 'EXIT_FAIL: ' + String(e.stderr || e.stdout || e.message).slice(0, 300);
  }
}

(async () => {
  let pass = 0, fail = 0;
  const t = (name, cond) => { cond ? pass++ : fail++; console.log((cond ? '✔' : '✖') + ' ' + name); };

  await makeBackup();
  // 1) senha correta → certifica
  const ok = run(PASS);
  t('senha correta: REAL_RECOVERY_CERTIFIED=YES', /REAL_RECOVERY_CERTIFIED=YES/.test(ok));
  t('senha correta: AES-GCM autenticado', /autenticado e descriptografado/.test(ok));
  t('senha correta: integridade sidecar OK', /Integridade SHA-256: OK/.test(ok));
  t('senha correta: contagens sem valores', /"assets":1/.test(ok));

  // 2) senha errada → aborta sem vazar
  const bad = run('senha-errada');
  t('senha errada: DESCRYPT FALHOU e aborta', /DESCRYPT FALHOU/.test(bad));
  t('senha errada: não certifica', !/REAL_RECOVERY_CERTIFIED=YES/.test(bad));

  // 3) arquivo adulterado (ciphertext corrompido, sidecar regenerado para isolar o AES)
  const env = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  env.ciphertext = env.ciphertext.slice(0, -8) + 'AAAAAAA=';
  fs.writeFileSync(FILE, JSON.stringify(env));
  const sha2 = crypto.createHash('sha256').update(fs.readFileSync(FILE)).digest('hex');
  fs.writeFileSync(FILE + '.sha256', 'sha256=' + sha2 + '\n');
  const tam = run(PASS);
  t('adulterado: AES-GCM recusa', /DESCRYPT FALHOU/.test(tam) || !/REAL_RECOVERY_CERTIFIED=YES/.test(tam));

  // 4) sidecar divergente → aborta ANTES da leitura
  fs.writeFileSync(FILE + '.sha256', 'sha256=' + '0'.repeat(64) + '\n');
  const tam2 = run(PASS);
  t('sidecar divergente: aborta antes de tudo', /NÃO confere/.test(tam2));

  fs.rmSync(TMP, { recursive: true, force: true });
  console.log('tests=' + (pass + fail) + ' pass=' + pass + ' fail=' + fail);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FAIL', String(e).slice(0, 200)); process.exit(1); });
