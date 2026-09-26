const assert = require('node:assert/strict');
const test = require('node:test');
const Manifest = require('../import-fixture-manifest.js');
const Sanitizer = require('../import-fixture-sanitizer.js');
const Cli = require('../import-fixture-cli.js');
const fs = require('node:fs');
const path = require('node:path');

const TEST_FIXTURES_DIR = path.join(__dirname, 'fixtures', 'import-center', 'test-temp');

function setupTestDir() {
  if (!fs.existsSync(TEST_FIXTURES_DIR)) {
    fs.mkdirSync(TEST_FIXTURES_DIR, { recursive: true });
  }
}

function cleanupTestDir() {
  if (fs.existsSync(TEST_FIXTURES_DIR)) {
    fs.rmSync(TEST_FIXTURES_DIR, { recursive: true, force: true });
  }
}

test('Manifest: createEmptyManifest produces valid structure', () => {
  const manifest = Manifest.createEmptyManifest();
  assert.equal(manifest.schemaVersion, Manifest.SCHEMA_VERSION);
  assert.ok(Array.isArray(manifest.fixtures));
  assert.equal(manifest.fixtures.length, 0);
  assert.ok(manifest.generatedAt);
});

test('Manifest: createFixtureEntry produces valid entry', () => {
  const entry = Manifest.createFixtureEntry({
    fixtureId: 'INTER_BROKERAGE-NOTE-PDF_001.json',
    broker: 'INTER',
    documentType: 'BROKERAGE_NOTE_PDF',
    format: 'PDF',
    sourceKind: 'REAL_SANITIZED',
    sanitized: true,
    sanitizationVersion: '1.0',
    receivedAt: new Date().toISOString(),
    expectedDetection: { provider: 'INTER', sourceType: 'BROKERAGE_NOTE_PDF', confidence: 'HIGH' },
    expectedParserOutcome: 'PARSED',
    notes: 'Test fixture',
    provenance: { originalFileName: 'nota-inter-sanitized.pdf', originalFileSize: 12345 }
  });
  assert.equal(entry.fixtureId, 'INTER_BROKERAGE-NOTE-PDF_001.json');
  assert.equal(entry.broker, 'INTER');
  assert.equal(entry.documentType, 'BROKERAGE_NOTE_PDF');
  assert.equal(entry.format, 'PDF');
  assert.equal(entry.sourceKind, 'REAL_SANITIZED');
  assert.equal(entry.sanitized, true);
  assert.equal(entry.expectedParserOutcome, 'PARSED');
  assert.ok(entry.provenance);
});

test('Manifest: validateFixtureEntry catches missing required fields', () => {
  const errors = Manifest.validateFixtureEntry({}, 0);
  assert.ok(errors.length > 0);
  assert.ok(errors.some(e => e.field === 'fixtureId'));
  assert.ok(errors.some(e => e.field === 'broker'));
  assert.ok(errors.some(e => e.field === 'documentType'));
  assert.ok(errors.some(e => e.field === 'sanitized'));
});

test('Manifest: validateFixtureEntry catches invalid broker', () => {
  const entry = Manifest.createFixtureEntry({
    fixtureId: 'test.json',
    broker: 'INVALID_BROKER',
    documentType: 'BROKERAGE_NOTE_PDF',
    format: 'PDF',
    sourceKind: 'REAL_SANITIZED',
    sanitized: true,
    sanitizationVersion: '1.0',
    receivedAt: new Date().toISOString(),
    expectedDetection: {},
    expectedParserOutcome: 'PARSED'
  });
  const errors = Manifest.validateFixtureEntry(entry, 0);
  assert.ok(errors.some(e => e.field === 'broker' && e.error === 'INVALID_OR_MISSING'));
});

test('Manifest: validateFixtureEntry catches duplicate fixtureId', () => {
  const manifest = Manifest.createEmptyManifest();
  const entry = Manifest.createFixtureEntry({
    fixtureId: 'duplicate.json',
    broker: 'INTER',
    documentType: 'BROKERAGE_NOTE_PDF',
    format: 'PDF',
    sourceKind: 'REAL_SANITIZED',
    sanitized: true,
    sanitizationVersion: '1.0',
    receivedAt: new Date().toISOString(),
    expectedDetection: {},
    expectedParserOutcome: 'PARSED'
  });
  manifest.fixtures.push(entry);
  manifest.fixtures.push(entry); // duplicate
  const validation = Manifest.validateManifest(manifest);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some(e => e.error === 'DUPLICATE'));
});

test('Sanitizer: sanitizeContent redacts CPF in dry-run mode (no mutation)', () => {
  const content = 'CPF: 123.456.789-00';
  const result = Sanitizer.sanitizeContent(content, { dryRun: true });
  assert.equal(result.sanitized, content); // unchanged in dryRun
  assert.ok(result.redactions.some(r => r.pattern === 'CPF'));
});

test('Sanitizer: sanitizeContent redacts CPF when not dry-run', () => {
  const content = 'CPF: 123.456.789-00';
  const result = Sanitizer.sanitizeContent(content, { dryRun: false });
  assert.notEqual(result.sanitized, content);
  assert.ok(result.sanitized.includes('[CPF_REDACTED]'));
  assert.ok(result.redactions.some(r => r.pattern === 'CPF'));
});

test('Sanitizer: sanitizeContent redacts CNPJ', () => {
  const content = 'CNPJ: 12.345.678/0001-99';
  const result = Sanitizer.sanitizeContent(content, { dryRun: false });
  assert.ok(result.sanitized.includes('[CNPJ_REDACTED]'));
});

test('Sanitizer: sanitizeContent redacts email', () => {
  const content = 'Email: cliente@exemplo.com';
  const result = Sanitizer.sanitizeContent(content, { dryRun: false });
  assert.ok(result.sanitized.includes('[EMAIL_REDACTED]'));
});

test('Sanitizer: sanitizeContent redacts phone', () => {
  const content = 'Telefone: (11) 99999-8888';
  const result = Sanitizer.sanitizeContent(content, { dryRun: false });
  assert.ok(result.sanitized.includes('[PHONE_REDACTED]'));
});

test('Sanitizer: sanitizeContent preserves monetary values', () => {
  const content = 'Valor: R$ 1.234,56';
  const result = Sanitizer.sanitizeContent(content, { dryRun: false });
  assert.ok(result.sanitized.includes('R$'));
  assert.ok(result.sanitized.includes('1.234,56'));
});

test('Sanitizer: sanitizeContent preserves dates', () => {
  const content = 'Data: 15/09/2026';
  const result = Sanitizer.sanitizeContent(content, { dryRun: false });
  assert.ok(result.sanitized.includes('15/09/2026'));
});

test('Sanitizer: sanitizeContent preserves tickers', () => {
  const content = 'Ativo: PETR4';
  const result = Sanitizer.sanitizeContent(content, { dryRun: false });
  assert.ok(result.sanitized.includes('PETR4'));
});

test('Sanitizer: analyzeContent finds PII', () => {
  const content = 'CPF: 123.456.789-00, Email: teste@teste.com';
  const findings = Sanitizer.analyzeContent(content);
  assert.ok(findings.some(f => f.pattern === 'CPF' && f.severity === 'HIGH'));
  assert.ok(findings.some(f => f.pattern === 'EMAIL' && f.severity === 'MEDIUM'));
});

test('Sanitizer: generateFixtureId produces consistent IDs', () => {
  const id1 = Sanitizer.generateFixtureId('INTER', 'BROKERAGE_NOTE_PDF', 1);
  const id2 = Sanitizer.generateFixtureId('INTER', 'BROKERAGE_NOTE_PDF', 1);
  assert.equal(id1, id2);
  assert.equal(id1, 'INTER_BROKERAGE-NOTE-PDF_001.json');
});

test('Sanitizer: detectBrokerFromContent identifies known brokers', () => {
  assert.equal(Sanitizer.detectBrokerFromContent('INTER DTVM LTDA Nota de Corretagem'), 'INTER');
  assert.equal(Sanitizer.detectBrokerFromContent('XP INVESTIMENTOS Corretora'), 'XP');
  assert.equal(Sanitizer.detectBrokerFromContent('BTG PACTUAL Corretora'), 'BTG');
  assert.equal(Sanitizer.detectBrokerFromContent('B3 Movimentos'), 'B3');
  assert.equal(Sanitizer.detectBrokerFromContent('Unknown content'), 'UNKNOWN');
});

test('Sanitizer: detectDocumentTypeFromContent identifies document types', () => {
  assert.equal(Sanitizer.detectDocumentTypeFromContent('Nota de Corretagem', 'pdf'), 'BROKERAGE_NOTE_PDF');
  assert.equal(Sanitizer.detectDocumentTypeFromContent('Proventos Dividendos', 'xlsx'), 'B3_DIVIDENDS_XLSX');
  assert.equal(Sanitizer.detectDocumentTypeFromContent('Movimentação Negociação', 'xlsx'), 'B3_MOVEMENTS_XLSX');
  assert.equal(Sanitizer.detectDocumentTypeFromContent('Posição Custódia', 'xlsx'), 'B3_POSITION_XLSX');
  assert.equal(Sanitizer.detectDocumentTypeFromContent('Unknown', 'pdf'), 'UNKNOWN');
});

test('Sanitizer: validateSanitizedOutput warns on excessive reduction', () => {
  const original = 'A'.repeat(1000);
  const sanitized = 'B';
  const warnings = Sanitizer.validateSanitizedOutput(original, sanitized);
  assert.ok(warnings.includes('EXCESSIVE_REDUCTION_POSSIBLE_OVER_REDACTION'));
});

test('Sanitizer: validateSanitizedOutput warns on all monetary removed', () => {
  const original = 'R$ 100,00 e R$ 200,00';
  const sanitized = 'Sem valores';
  const warnings = Sanitizer.validateSanitizedOutput(original, sanitized);
  assert.ok(warnings.includes('ALL_MONETARY_VALUES_REMOVED'));
});

test('CLI: inspect analyzes file correctly', () => {
  setupTestDir();
  const testFile = path.join(TEST_FIXTURES_DIR, 'test-inter.pdf');
  fs.writeFileSync(testFile, 'INTER DTVM LTDA\nNota de Corretagem\nCPF: 123.456.789-00', 'utf8');
  const result = Cli.inspect(testFile);
  assert.equal(result.exists, true);
  assert.equal(result.detectedBroker, 'INTER');
  assert.equal(result.detectedDocumentType, 'BROKERAGE_NOTE_PDF');
  assert.ok(result.piiAnalysis.some(f => f.pattern === 'CPF'));
  cleanupTestDir();
});

test('CLI: validate catches missing manifest file', () => {
  const os = require('node:os');
  const fs = require('node:fs');
  const path = require('node:path');
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fixture-test-'));
  const CliIsolated = require('../import-fixture-cli.js').create({ fixturesDir: tempDir, manifestPath: path.join(tempDir, 'fixture-manifest.json') });
  const result = CliIsolated.validate();
  assert.equal(result.summary.totalFixtures, 0);
  assert.equal(result.summary.manifestValid, true);
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('CLI: registerFixture creates entry and copies file in non-dry-run', () => {
  setupTestDir();
  const testFile = path.join(TEST_FIXTURES_DIR, 'source-sanitized.json');
  fs.writeFileSync(testFile, JSON.stringify({ test: 'data' }), 'utf8');
  const result = Cli.registerFixture({
    sourcePath: testFile,
    fixtureId: 'INTER_BROKERAGE-NOTE-PDF_001.json',
    sourceKind: 'REAL_SANITIZED',
    sanitized: true,
    dryRun: false
  });
  assert.equal(result.dryRun, false);
  assert.equal(result.fixtureId, 'INTER_BROKERAGE-NOTE-PDF_001.json');
  assert.ok(fs.existsSync(path.join(Cli.FIXTURES_DIR, 'INTER_BROKERAGE-NOTE-PDF_001.json')));
  cleanupTestDir();
});

test('CLI: registerFixture dry-run does not copy file', () => {
  setupTestDir();
  const testFile = path.join(TEST_FIXTURES_DIR, 'source-sanitized.json');
  fs.writeFileSync(testFile, JSON.stringify({ test: 'data' }), 'utf8');
  const result = Cli.registerFixture({
    sourcePath: testFile,
    fixtureId: 'INTER_BROKERAGE-NOTE-PDF_002.json',
    dryRun: true
  });
  assert.equal(result.dryRun, true);
  assert.ok(!fs.existsSync(path.join(Cli.FIXTURES_DIR, 'INTER_BROKERAGE-NOTE-PDF_002.json')));
  cleanupTestDir();
});

test('CLI: registerFixture rejects duplicate fixtureId', () => {
  setupTestDir();
  const testFile = path.join(TEST_FIXTURES_DIR, 'source-sanitized.json');
  fs.writeFileSync(testFile, JSON.stringify({ test: 'data' }), 'utf8');
  Cli.registerFixture({ sourcePath: testFile, fixtureId: 'DUPLICATE.json', dryRun: false });
  const result = Cli.registerFixture({ sourcePath: testFile, fixtureId: 'DUPLICATE.json', dryRun: false });
  assert.equal(result.error, 'DUPLICATE_FIXTURE_ID');
  cleanupTestDir();
});

test('CLI: sanitize dry-run shows redactions without writing', () => {
  setupTestDir();
  const testFile = path.join(TEST_FIXTURES_DIR, 'raw.pdf');
  fs.writeFileSync(testFile, 'CPF: 123.456.789-00\nValor: R$ 100,00', 'utf8');
  const result = Cli.sanitize(testFile, { dryRun: true });
  assert.equal(result.dryRun, true);
  assert.ok(result.redactions.some(r => r.pattern === 'CPF'));
  assert.ok(result.warnings.length === 0 || result.warnings.every(w => w !== 'ALL_MONETARY_VALUES_REMOVED'));
  cleanupTestDir();
});

test('CLI: sanitize non-dry-run writes sanitized file', () => {
  setupTestDir();
  const testFile = path.join(TEST_FIXTURES_DIR, 'raw.pdf');
  const outputFile = path.join(TEST_FIXTURES_DIR, 'sanitized.pdf');
  fs.writeFileSync(testFile, 'CPF: 123.456.789-00\nValor: R$ 100,00', 'utf8');
  const result = Cli.sanitize(testFile, { dryRun: false, outputPath: outputFile });
  assert.equal(result.dryRun, false);
  const outputContent = fs.readFileSync(outputFile, 'utf8');
  assert.ok(outputContent.includes('[CPF_REDACTED]'));
  assert.ok(outputContent.includes('R$ 100,00'));
  cleanupTestDir();
});

test('CLI: list returns fixture entries', () => {
  setupTestDir();
  const testFile = path.join(TEST_FIXTURES_DIR, 'source-sanitized.json');
  fs.writeFileSync(testFile, JSON.stringify({ test: 'data' }), 'utf8');
  Cli.registerFixture({ sourcePath: testFile, fixtureId: 'LIST_TEST.json', dryRun: false });
  const list = Cli.list();
  assert.ok(list.some(f => f.fixtureId === 'LIST_TEST.json'));
  cleanupTestDir();
});

test('CLI: runHarness runs detection on fixture', () => {
  setupTestDir();
  const testFile = path.join(TEST_FIXTURES_DIR, 'source-sanitized.pdf');
  fs.writeFileSync(testFile, 'INTER DTVM LTDA\nNota de Corretagem', 'utf8');
  Cli.registerFixture({ sourcePath: testFile, fixtureId: 'HARNESS_TEST.pdf', dryRun: false });
  const result = Cli.runHarness({ fixtureId: 'HARNESS_TEST.pdf' });
  assert.equal(result.fixtureId, 'HARNESS_TEST.pdf');
  assert.equal(result.detection.provider, 'INTER');
  cleanupTestDir();
});

test('Manifest: scanForPII finds Brazilian PII patterns', () => {
  const content = 'CPF 123.456.789-00 CNPJ 12.345.678/0001-99 email@test.com (11) 99999-8888';
  const findings = Manifest.scanForPII(content, 'test.txt');
  assert.ok(findings.some(f => f.pattern === 'CPF' && f.severity === 'HIGH'));
  assert.ok(findings.some(f => f.pattern === 'CNPJ' && f.severity === 'HIGH'));
  assert.ok(findings.some(f => f.pattern === 'EMAIL' && f.severity === 'MEDIUM'));
  assert.ok(findings.some(f => f.pattern === 'PHONE_BR' && f.severity === 'MEDIUM'));
});

test('Manifest: validateFixtureContent detects PII in unsanitized fixture', () => {
  setupTestDir();
  const fixture = Manifest.createFixtureEntry({
    fixtureId: 'UNSANITIZED_TEST.json',
    broker: 'INTER',
    documentType: 'BROKERAGE_NOTE_PDF',
    format: 'PDF',
    sourceKind: 'REAL_SANITIZED',
    sanitized: false, // UNSANITIZED
    sanitizationVersion: '1.0',
    receivedAt: new Date().toISOString(),
    expectedDetection: {},
    expectedParserOutcome: 'PARSED'
  });
  const testFile = path.join(TEST_FIXTURES_DIR, 'UNSANITIZED_TEST.json');
  fs.writeFileSync(testFile, 'CPF: 123.456.789-00', 'utf8');
  const result = Manifest.validateFixtureContent(fixture, fs, path, TEST_FIXTURES_DIR);
  assert.ok(result.errors.some(e => e.error === 'PII_DETECTED_IN_UNSANITIZED_FIXTURE'));
  cleanupTestDir();
});

test('Sanitizer: scanForPII conservative - does not flag monetary values as PII', () => {
  const content = 'R$ 1.234,56 R$ 100,00 50% 15/09/2026 PETR4';
  const findings = Manifest.scanForPII(content, 'test.txt');
  assert.equal(findings.length, 0); // Should not flag monetary, percentages, dates, tickers
});

test('CLI: inspect handles binary files gracefully', () => {
  setupTestDir();
  const testFile = path.join(TEST_FIXTURES_DIR, 'binary.dat');
  fs.writeFileSync(testFile, Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])); // PNG header
  const result = Cli.inspect(testFile);
  assert.equal(result.exists, true);
  assert.equal(result.encoding, 'binary');
  assert.equal(result.format, 'PNG');
  assert.equal(result.isBinary, true);
  cleanupTestDir();
});

test('Sanitizer: customPatterns can be added for specific needs', () => {
  const content = 'CUSTOM_FIELD: secret123';
  const customPatterns = [
    { name: 'CUSTOM_SECRET', regex: /CUSTOM_FIELD:\s*(\w+)/g, replacement: 'CUSTOM_FIELD: [REDACTED]' }
  ];
  const result = Sanitizer.sanitizeContent(content, { dryRun: false, customPatterns });
  assert.ok(result.sanitized.includes('[REDACTED]'));
  assert.ok(result.redactions.some(r => r.pattern === 'CUSTOM_SECRET'));
});

test('Manifest: expectedParserOutcome reflects broker capability', () => {
  // XP and BTG are FIXTURE_REQUIRED, so expectedParserOutcome should be FIXTURE_REQUIRED
  const xpEntry = Manifest.createFixtureEntry({
    fixtureId: 'XP_TEST.json',
    broker: 'XP',
    documentType: 'BROKERAGE_NOTE_PDF',
    format: 'PDF',
    sourceKind: 'SYNTHETIC_GENERIC_TEST_DATA',
    sanitized: true,
    sanitizationVersion: '1.0',
    receivedAt: new Date().toISOString(),
    expectedDetection: { provider: 'XP', sourceType: 'BROKERAGE_NOTE_PDF', confidence: 'HIGH' },
    expectedParserOutcome: 'FIXTURE_REQUIRED'
  });
  assert.equal(xpEntry.expectedParserOutcome, 'FIXTURE_REQUIRED');
});

test('Sanitizer: createSanitizationReport includes all metadata', () => {
  const findings = [{ pattern: 'CPF', severity: 'HIGH', count: 1 }];
  const redactions = [{ pattern: 'CPF', count: 1 }];
  const report = Sanitizer.createSanitizationReport('/path/to/source.pdf', 'INTER_TEST.json', findings, redactions, { dryRun: true, originalSize: 1024 });
  assert.equal(report.fixtureId, 'INTER_TEST.json');
  assert.equal(report.sourcePath, '/path/to/source.pdf');
  assert.ok(report.timestamp);
  assert.equal(report.dryRun, true);
  assert.equal(report.piiFindings.length, 1);
  assert.equal(report.redactionsApplied.length, 1);
  assert.equal(report.fileSize, 1024);
  assert.equal(report.sanitizationVersion, '1.0');
  assert.equal(report.policy, 'conservative');
});

test('Manifest: validateFilesMatchManifest detects orphan files', () => {
  setupTestDir();
  const manifest = Manifest.createEmptyManifest();
  // Create orphan file
  const orphanFile = path.join(TEST_FIXTURES_DIR, 'orphan.json');
  fs.writeFileSync(orphanFile, '{}', 'utf8');
  // Point manifest to test dir temporarily
  const result = Manifest.validateFilesMatchManifest(manifest, fs, path, TEST_FIXTURES_DIR);
  assert.ok(result.orphanFiles.includes('orphan.json'));
  cleanupTestDir();
});

cleanupTestDir();