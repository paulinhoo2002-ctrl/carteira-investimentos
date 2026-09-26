/* Fixture intake CLI tool for Import Center.
 * Safe local tooling for inspecting, validating, and registering fixtures.
 * Defaults to dry-run. No automatic commits or uploads.
 */
(function initImportFixtureCli(root, factory) {
  const api = factory();
  if (root) root.ImportFixtureCli = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
    module.exports.create = factory;
  }
})(typeof globalThis !== 'undefined' ? globalThis : null, function createImportFixtureCliApi(options = {}) {
  const fs = require('node:fs');
  const path = require('node:path');
  const Manifest = require('./import-fixture-manifest.js');
  const Sanitizer = require('./import-fixture-sanitizer.js');
  const Core = require('./import-center-core.js');

  // Dependency injection for test isolation; defaults to canonical repo paths
  const FIXTURES_DIR = options.fixturesDir || path.join(__dirname, 'tests', 'fixtures', 'import-center');
  const MANIFEST_PATH = options.manifestPath || path.join(FIXTURES_DIR, Manifest.MANIFEST_FILENAME);

  // Reuse canonical provider enum from import-center-core
  const PROVIDERS = Core.PROVIDERS;

  function ensureFixturesDir() {
    if (!fs.existsSync(FIXTURES_DIR)) {
      fs.mkdirSync(FIXTURES_DIR, { recursive: true });
    }
  }

  function loadManifest() {
    ensureFixturesDir();
    if (fs.existsSync(MANIFEST_PATH)) {
      try {
        return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
      } catch (e) {
        return Manifest.createEmptyManifest();
      }
    }
    return Manifest.createEmptyManifest();
  }

  function saveManifest(manifest, dryRun = true) {
    if (dryRun) return { dryRun: true, path: MANIFEST_PATH, wouldWrite: true };
    ensureFixturesDir();
    const output = { ...manifest, generatedAt: new Date().toISOString() };
    // Atomic write: write to temp file then rename (handle Windows)
    const tempPath = MANIFEST_PATH + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(output, null, 2), 'utf8');
    try {
      fs.renameSync(tempPath, MANIFEST_PATH);
    } catch (e) {
      // Windows: destination exists, need to unlink first
      if (e.code === 'EPERM' || e.code === 'EEXIST') {
        fs.unlinkSync(MANIFEST_PATH);
        fs.renameSync(tempPath, MANIFEST_PATH);
      } else {
        throw e;
      }
    }
    return { dryRun: false, path: MANIFEST_PATH, written: true };
  }

  function inspect(filePath) {
    const results = { file: filePath, exists: false };
    if (!fs.existsSync(filePath)) {
      results.error = 'FILE_NOT_FOUND';
      return results;
    }
    results.exists = true;
    const stats = fs.statSync(filePath);
    results.size = stats.size;
    results.extension = path.extname(filePath).toLowerCase().replace('.', '');
    
    // Binary detection
    const buffer = fs.readFileSync(filePath);
    const isBinary = detectBinary(buffer);
    results.isBinary = isBinary;
    
    if (isBinary) {
      results.encoding = 'binary';
      results.format = detectBinaryFormat(buffer);
      return results;
    }
    
    try {
      const content = buffer.toString('utf8');
      results.contentPreview = content.slice(0, 500);
      results.encoding = 'utf8';
      results.piiAnalysis = Sanitizer.analyzeContent(content);
      results.detectedBroker = Sanitizer.detectBrokerFromContent(content);
      results.detectedDocumentType = Sanitizer.detectDocumentTypeFromContent(content, results.extension);
    } catch (e) {
      results.encoding = 'binary';
      results.error = 'CANNOT_READ_AS_UTF8';
    }
    return results;
  }

  function detectBinary(buffer) {
    if (buffer.length === 0) return false;
    // Check for null bytes (common in binary)
    if (buffer.includes(0)) return true;
    // Check for known binary signatures (magic bytes)
    if (buffer.length >= 8) {
      // PNG
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
          buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) {
        return true;
      }
      // PDF
      if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
        return true;
      }
      // ZIP/XLSX (PK header)
      if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
        return true;
      }
    }
    // Check for high control character ratio
    let controlChars = 0;
    const sampleSize = Math.min(buffer.length, 8192);
    for (let i = 0; i < sampleSize; i++) {
      const byte = buffer[i];
      if (byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) { // not tab, LF, CR
        controlChars++;
      }
    }
    if (controlChars / sampleSize > 0.3) return true;
    return false;
  }

  function detectBinaryFormat(buffer) {
    // Check magic bytes
    if (buffer.length >= 8) {
      // PNG
      if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
          buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) {
        return 'PNG';
      }
      // PDF
      if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
        return 'PDF';
      }
      // ZIP/XLSX (PK header)
      if (buffer[0] === 0x50 && buffer[1] === 0x4B) {
        return 'ZIP_XLSX';
      }
    }
    return 'UNKNOWN_BINARY';
  }

  function validate() {
    const manifest = loadManifest();
    const manifestValidation = Manifest.validateManifest(manifest);
    const fileValidation = Manifest.validateFilesMatchManifest(manifest, fs, path, FIXTURES_DIR);
    let contentErrors = [];
    let contentWarnings = [];
    if (manifest.fixtures) {
      for (const fixture of manifest.fixtures) {
        const contentValidation = Manifest.validateFixtureContent(fixture, fs, path, FIXTURES_DIR);
        contentErrors.push(...contentValidation.errors);
        contentWarnings.push(...contentValidation.warnings);
      }
    }
    return {
      manifest: manifestValidation,
      files: fileValidation,
      content: { errors: contentErrors, warnings: contentWarnings },
      summary: {
        totalFixtures: manifest.fixtures?.length || 0,
        manifestValid: manifestValidation.valid,
        filesMatch: fileValidation.missingFiles.length === 0 && fileValidation.orphanFiles.length === 0,
        contentClean: contentErrors.length === 0
      }
    };
  }

  function registerFixture(options = {}) {
    const {
      sourcePath,
      fixtureId,
      broker,
      documentType,
      format,
      sourceKind = 'REAL_SANITIZED',
      sanitized = true,
      sanitizationVersion = '1.0',
      expectedDetection,
      expectedParserOutcome,
      notes = '',
      provenance = {},
      dryRun = true
    } = options;

    if (!sourcePath || !fs.existsSync(sourcePath)) {
      return { error: 'SOURCE_PATH_REQUIRED_AND_MUST_EXIST' };
    }

    const manifest = loadManifest();
    const finalFixtureId = fixtureId || path.basename(sourcePath);
    const destPath = path.join(FIXTURES_DIR, finalFixtureId);

    // Check duplicate first
    if (manifest.fixtures.some(f => f.fixtureId === finalFixtureId)) {
      return { error: 'DUPLICATE_FIXTURE_ID', fixtureId: finalFixtureId, dryRun };
    }

    const content = fs.readFileSync(sourcePath);
    const contentStr = content.toString('utf8');
    const detectedBroker = broker || Sanitizer.detectBrokerFromContent(contentStr);
    const detectedDocType = documentType || Sanitizer.detectDocumentTypeFromContent(contentStr, path.extname(sourcePath).toLowerCase().replace('.', ''));
    const detectedFormat = format || path.extname(sourcePath).toLowerCase().replace('.', '').toUpperCase();

    const entry = Manifest.createFixtureEntry({
      fixtureId: finalFixtureId,
      broker: detectedBroker,
      documentType: detectedDocType,
      format: detectedFormat,
      sourceKind,
      sanitized,
      sanitizationVersion,
      receivedAt: new Date().toISOString(),
      expectedDetection: expectedDetection || { provider: detectedBroker, sourceType: detectedDocType, confidence: 'HIGH' },
      expectedParserOutcome: expectedParserOutcome || (['SUPPORTED', 'FULL'].includes(PROVIDERS?.[detectedBroker]?.status) ? 'PARSED' : 'FIXTURE_REQUIRED'),
      notes,
      provenance: { ...provenance, originalFileName: path.basename(sourcePath), originalFileSize: content.length }
    });

    const entryValidation = Manifest.validateFixtureEntry(entry, 0);
    if (entryValidation.length > 0) {
      return { error: 'INVALID_FIXTURE_ENTRY', details: entryValidation, dryRun };
    }

    // For new registration, copy file first (if not dryRun), then validate content
    // This avoids FILE_NOT_FOUND error since the file needs to exist at destination for validation
    if (!dryRun) {
      ensureFixturesDir();
      fs.copyFileSync(sourcePath, destPath);
    }

    const contentValidation = Manifest.validateFixtureContent(entry, fs, path, FIXTURES_DIR);
    if (contentValidation.errors.length > 0) {
      // If we copied and validation failed, clean up the copied file
      if (!dryRun && fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
      return { error: 'CONTENT_VALIDATION_FAILED', details: contentValidation.errors, dryRun };
    }

    const report = Sanitizer.createSanitizationReport(sourcePath, finalFixtureId, contentValidation.errors, [], { dryRun, originalSize: content.length });

    if (!dryRun) {
      manifest.fixtures.push(entry);
      saveManifest(manifest, false);
    }

    return {
      dryRun,
      fixtureId: finalFixtureId,
      destPath,
      entry,
      report,
      warnings: contentValidation.warnings
    };
  }

  function sanitize(sourcePath, options = {}) {
    const { dryRun = true, outputPath, customPatterns = [] } = options;
    if (!fs.existsSync(sourcePath)) {
      return { error: 'SOURCE_PATH_NOT_FOUND' };
    }
    const content = fs.readFileSync(sourcePath, 'utf8');
    const analysis = Sanitizer.analyzeContent(content);
    const result = Sanitizer.sanitizeContent(content, { dryRun, customPatterns });
    const warnings = Sanitizer.validateSanitizedOutput(content, result.sanitized);
    if (!dryRun && outputPath) {
      fs.writeFileSync(outputPath, result.sanitized, 'utf8');
    }
    return {
      dryRun,
      sourcePath,
      outputPath: outputPath || null,
      analysis,
      redactions: result.redactions,
      warnings,
      preview: dryRun ? result.sanitized.slice(0, 1000) : null
    };
  }

  function list() {
    const manifest = loadManifest();
    return manifest.fixtures.map(f => ({
      fixtureId: f.fixtureId,
      broker: f.broker,
      documentType: f.documentType,
      format: f.format,
      sourceKind: f.sourceKind,
      sanitized: f.sanitized,
      expectedParserOutcome: f.expectedParserOutcome,
      receivedAt: f.receivedAt
    }));
  }

  function runHarness(options = {}) {
    const { fixtureId, sourceType } = options;
    const manifest = loadManifest();
    const fixture = manifest.fixtures.find(f => f.fixtureId === fixtureId);
    if (!fixture) return { error: 'FIXTURE_NOT_FOUND', fixtureId };
    const filePath = path.join(FIXTURES_DIR, fixtureId);
    if (!fs.existsSync(filePath)) return { error: 'FIXTURE_FILE_MISSING', fixtureId };
    const content = fs.readFileSync(filePath, 'utf8');
    const Core = require('./import-center-core.js');
    const detection = Core.detectImportFile({ name: fixtureId, text: content });
    const parsed = detection.parser ? 'PARSER_AVAILABLE' : 'NO_PARSER_REGISTERED';
    return { fixtureId, detection: { provider: detection.provider, sourceType: detection.sourceType, confidence: detection.confidence, evidence: detection.evidence }, parsed, expected: fixture.expectedDetection, expectedOutcome: fixture.expectedParserOutcome };
  }

  return {
    FIXTURES_DIR,
    MANIFEST_PATH,
    inspect,
    validate,
    registerFixture,
    sanitize,
    list,
    runHarness,
    loadManifest,
    saveManifest
  };
});