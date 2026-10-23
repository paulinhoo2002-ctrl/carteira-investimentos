'use strict';

const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const { test } = require('node:test');
const Backup = require('../backup-portability.js');

const passphrase = 'synthetic-only passphrase 2026';
const payload = {
  marker: 'SYNTHETIC_BACKUP_SENTINEL',
  wallets: [{ id: 'synthetic-wallet-1', balance: 12345 }],
};

test('encrypted backup roundtrips without exposing plaintext', async () => {
  const encrypted = await Backup.encryptBackup(payload, passphrase, { cryptoProvider: webcrypto });

  assert.equal(encrypted.format, 'carteira-investimentos-backup-encrypted');
  assert.equal(encrypted.version, 1);
  assert.equal(JSON.stringify(encrypted).includes(payload.marker), false);
  assert.deepEqual(await Backup.decryptBackup(encrypted, passphrase, { cryptoProvider: webcrypto }), payload);
});

test('encrypted backup uses a fresh salt and IV for each export', async () => {
  const [first, second] = await Promise.all([
    Backup.encryptBackup(payload, passphrase, { cryptoProvider: webcrypto }),
    Backup.encryptBackup(payload, passphrase, { cryptoProvider: webcrypto }),
  ]);

  assert.notEqual(first.kdf.salt, second.kdf.salt);
  assert.notEqual(first.cipher.iv, second.cipher.iv);
});

test('encrypted backup rejects wrong passphrase and tampering', async () => {
  const encrypted = await Backup.encryptBackup(payload, passphrase, { cryptoProvider: webcrypto });

  await assert.rejects(
    Backup.decryptBackup(encrypted, 'different synthetic passphrase', { cryptoProvider: webcrypto }),
    /DECRYPTION_FAILED/,
  );

  const tampered = structuredClone(encrypted);
  tampered.ciphertext = tampered.ciphertext.slice(0, -4) + 'AAAA';
  await assert.rejects(
    Backup.decryptBackup(tampered, passphrase, { cryptoProvider: webcrypto }),
    /DECRYPTION_FAILED/,
  );
});

test('encrypted backup rejects weak passwords and unsupported envelopes', async () => {
  await assert.rejects(
    Backup.encryptBackup(payload, 'short', { cryptoProvider: webcrypto }),
    /PASSPHRASE_TOO_SHORT/,
  );
  await assert.rejects(
    Backup.decryptBackup({ format: 'unknown' }, passphrase, { cryptoProvider: webcrypto }),
    /UNSUPPORTED_ENCRYPTED_BACKUP/,
  );
});
test('encrypted backup accepts six characters and keeps older twelve-character envelopes readable', async () => {
  for (const password of ['123456', '123456789012', 'x'.repeat(128)]) {
    const envelope = await Backup.encryptBackup(payload, password, { cryptoProvider: webcrypto });
    assert.equal(envelope.kdf.iterations, 310000);
    assert.equal(envelope.cipher.name, 'AES-GCM');
    assert.deepEqual(await Backup.decryptBackup(envelope, password, { cryptoProvider: webcrypto }), payload);
  }
  const envelope = await Backup.encryptBackup(payload, '123456', { cryptoProvider: webcrypto });
  await assert.rejects(Backup.decryptBackup(envelope, '654321', { cryptoProvider: webcrypto }), /DECRYPTION_FAILED/);
  const previousEnvelope = {
    format: 'carteira-investimentos-backup-encrypted', version: 1,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 310000, salt: '0ET4US6CTotT6i1pT5vfKg==' },
    cipher: { name: 'AES-GCM', iv: 'ihLHHEsF13+ruZbK' },
    ciphertext: 'PAuu/rRav8c2Rq5cy3rTfgH2Kl7fLGFP+F2/EHnPU3e8dXkmlA8/SJn9kY5B3VQk',
  };
  assert.deepEqual(await Backup.decryptBackup(previousEnvelope, '123456789012', { cryptoProvider: webcrypto }), { marker: 'LEGACY_SYNTHETIC_V1' });
});
test('backup form keeps confirmation and warns about short passwords', () => {
  const fs = require('node:fs');
  const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /id="backup-encryption-passphrase"[^>]*minlength="6"/);
  assert.match(html, /id="backup-encryption-confirm"[^>]*minlength="6"/);
  assert.match(html, /if\(passphrase\.length<6\)/);
  assert.match(html, /if\(passphrase!==confirmation\)/);
  assert.match(html, /12 caracteres ou mais/);
  assert.match(html, /senhas curtas oferecem menor proteção/i);
});
test('backup UI encrypts downloads and decrypts before existing validation', () => {
  const fs = require('node:fs');
  const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  const exportStart = html.indexOf('async function exportBackup(){');
  const exportEnd = html.indexOf('function v324PeriodicBackupEligible(){', exportStart);
  const exportSource = html.slice(exportStart, exportEnd);
  const importStart = html.indexOf("document.getElementById('imp-file').addEventListener('change'");
  const importSource = html.slice(importStart, importStart + 2600);

  assert.notEqual(exportStart, -1);
  assert.match(exportSource, /BackupPortability\.encryptBackup\(payload,passphrase\)/);
  assert.match(exportSource, /backup-encryption-passphrase/);
  assert.match(exportSource, /backup-encryption-confirm/);
  assert.match(importSource, /await BackupPortability\.decryptBackup\(d,passphrase\)/);
  assert.ok(importSource.indexOf('decryptBackup') < importSource.indexOf('verifyBackup'));
  assert.match(html, /\.backup-encryption-fields\{grid-template-columns:1fr!important\}/);
  assert.match(html, /Histórico local neste navegador não recebe esta criptografia/);
});
