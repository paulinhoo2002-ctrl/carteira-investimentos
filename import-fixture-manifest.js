/* Fixture manifest schema and validation for Import Center test fixtures.
 * Ensures committed fixtures are discoverable, sanitized, and policy-compliant.
 */
(function initImportFixtureManifest(root, factory) {
  const api = factory();
  if (root) root.ImportFixtureManifest = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, function createImportFixtureManifestApi() {
  const SUPPORTED_BROKERS = Object.freeze(['B3', 'INTER', 'XP', 'BTG', 'UNKNOWN']);
  const FIXTURE_STATUSES = Object.freeze(['SUPPORTED', 'PARTIAL', 'FIXTURE_REQUIRED', 'UNSUPPORTED']);
  const DOCUMENT_TYPES = Object.freeze(['BROKERAGE_NOTE_PDF', 'B3_POSITION_XLSX', 'B3_MOVEMENTS_XLSX', 'B3_DIVIDENDS_XLSX', 'B3_CORPORATE_EVENTS_XLSX', 'UNKNOWN']);
  const SCHEMA_VERSION = 2;
  const MANIFEST_FILENAME = 'fixture-manifest.json';

  function validateFixtureEntry(entry, index) {
    const errors = [];
    if (!entry || typeof entry !== 'object') return [{ index, error: 'ENTRY_NOT_OBJECT' }];
    if (!entry.fixtureId || typeof entry.fixtureId !== 'string') errors.push({ index, field: 'fixtureId', error: 'MISSING_OR_INVALID' });
    if (!entry.broker || !SUPPORTED_BROKERS.includes(entry.broker)) errors.push({ index, field: 'broker', error: 'INVALID_OR_MISSING', validValues: SUPPORTED_BROKERS });
    if (!entry.documentType || !DOCUMENT_TYPES.includes(entry.documentType)) errors.push({ index, field: 'documentType', error: 'INVALID_OR_MISSING', validValues: DOCUMENT_TYPES });
    if (!entry.format || typeof entry.format !== 'string') errors.push({ index, field: 'format', error: 'MISSING' });
    if (!entry.sourceKind || !['REAL_SANITIZED', 'SYNTHETIC_GENERIC_TEST_DATA', 'LEGACY'].includes(entry.sourceKind)) errors.push({ index, field: 'sourceKind', error: 'INVALID_OR_MISSING' });
    if (typeof entry.sanitized !== 'boolean') errors.push({ index, field: 'sanitized', error: 'MISSING_OR_NOT_BOOLEAN' });
    if (!entry.sanitizationVersion || typeof entry.sanitizationVersion !== 'string') errors.push({ index, field: 'sanitizationVersion', error: 'MISSING' });
    if (!entry.receivedAt || typeof entry.receivedAt !== 'string') errors.push({ index, field: 'receivedAt', error: 'MISSING' });
    if (!entry.schemaVersion || typeof entry.schemaVersion !== 'number') errors.push({ index, field: 'schemaVersion', error: 'MISSING_OR_NOT_NUMBER' });
    if (!entry.expectedDetection || typeof entry.expectedDetection !== 'object') errors.push({ index, field: 'expectedDetection', error: 'MISSING_OR_NOT_OBJECT' });
    if (!entry.expectedParserOutcome || typeof entry.expectedParserOutcome !== 'string') errors.push({ index, field: 'expectedParserOutcome', error: 'MISSING' });
    if (entry.notes && typeof entry.notes !== 'string') errors.push({ index, field: 'notes', error: 'NOT_STRING' });
    if (!entry.provenance || typeof entry.provenance !== 'object') errors.push({ index, field: 'provenance', error: 'MISSING_OR_NOT_OBJECT' });
    return errors;
  }

  function validateManifest(manifest) {
    const errors = [];
    const warnings = [];
    if (!manifest || typeof manifest !== 'object') return { valid: false, errors: ['MANIFEST_NOT_OBJECT'], warnings: [] };
    if (!manifest.schemaVersion || manifest.schemaVersion !== SCHEMA_VERSION) {
      warnings.push({ code: 'SCHEMA_VERSION_MISMATCH', current: manifest.schemaVersion, expected: SCHEMA_VERSION });
    }
    if (!Array.isArray(manifest.fixtures)) {
      errors.push('MISSING_FIXTURES_ARRAY');
      return { valid: false, errors, warnings };
    }
    const seenIds = new Set();
    manifest.fixtures.forEach((fixture, index) => {
      const entryErrors = validateFixtureEntry(fixture, index);
      errors.push(...entryErrors);
      if (fixture?.fixtureId) {
        if (seenIds.has(fixture.fixtureId)) {
          errors.push({ index, field: 'fixtureId', error: 'DUPLICATE' });
        }
        seenIds.add(fixture.fixtureId);
      }
    });
    return { valid: errors.length === 0, errors, warnings };
  }

  function validateFilesMatchManifest(manifest, fs, path, baseDir) {
    const errors = [];
    const missingFiles = [];
    const orphanFiles = [];
    if (!manifest?.fixtures || !Array.isArray(manifest.fixtures)) return { errors: ['NO_MANIFEST_FIXTURES'], missingFiles, orphanFiles };
    const expectedFiles = new Set();
    manifest.fixtures.forEach(fixture => {
      const filePath = path.join(baseDir, fixture.fixtureId);
      expectedFiles.add(fixture.fixtureId);
      if (!fs.existsSync(filePath)) {
        missingFiles.push(fixture.fixtureId);
        errors.push({ fixtureId: fixture.fixtureId, error: 'MISSING_FIXTURE_FILE' });
      }
    });
    try {
      const actualFiles = fs.readdirSync(baseDir);
      actualFiles.forEach(file => {
        if (!expectedFiles.has(file) && !file.startsWith('.') && file !== MANIFEST_FILENAME) {
          orphanFiles.push(file);
        }
      });
    } catch (e) {
      // Directory might not exist
    }
    return { errors, missingFiles, orphanFiles };
  }

  function scanForPII(content, fileName) {
      const findings = [];
      // Use the same canonical PII patterns from sanitizer
      const Sanitizer = require('./import-fixture-sanitizer.js');
      for (const pattern of Sanitizer.PII_PATTERNS) {
        const matches = [...content.matchAll(pattern.regex)];
        if (matches.length > 0) {
          findings.push({ pattern: pattern.name, severity: pattern.severity, count: matches.length, samples: matches.slice(0, 3).map(m => m[0]) });
        }
      }
      return findings;
    }

  function validateFixtureContent(fixture, fs, path, baseDir) {
    const errors = [];
    const warnings = [];
    const filePath = path.join(baseDir, fixture.fixtureId);
    if (!fs.existsSync(filePath)) {
      errors.push({ fixtureId: fixture.fixtureId, error: 'FILE_NOT_FOUND' });
      return { errors, warnings };
    }
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (e) {
      content = fs.readFileSync(filePath);
    }
    if (fixture.sanitized === false && fixture.sourceKind !== 'SYNTHETIC_GENERIC_TEST_DATA') {
      const pii = scanForPII(content, fixture.fixtureId);
      if (pii.length > 0) {
        errors.push({ fixtureId: fixture.fixtureId, error: 'PII_DETECTED_IN_UNSANITIZED_FIXTURE', details: pii });
      }
    }
    if (fixture.sourceKind === 'SYNTHETIC_GENERIC_TEST_DATA') {
      if (!content.includes('SYNTHETIC') && !content.includes('GENERIC') && !content.includes('TEST')) {
        warnings.push({ fixtureId: fixture.fixtureId, warning: 'SYNTHETIC_FIXTURE_LACKS_EXPLICIT_MARKER' });
      }
    }
    return { errors, warnings };
  }

  function createEmptyManifest() {
    return {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      fixtures: []
    };
  }

  function createFixtureEntry({ fixtureId, broker, documentType, format, sourceKind, sanitized, sanitizationVersion, receivedAt, expectedDetection, expectedParserOutcome, notes = '', provenance = {} }) {
    return {
      fixtureId,
      broker,
      documentType,
      format,
      sourceKind,
      sanitized,
      sanitizationVersion,
      receivedAt,
      schemaVersion: SCHEMA_VERSION,
      expectedDetection,
      expectedParserOutcome,
      notes,
      provenance: {
        originalFileName: provenance.originalFileName || '',
        originalFileSize: provenance.originalFileSize || 0,
        sanitizationTool: provenance.sanitizationTool || 'manual',
        sanitizedAt: provenance.sanitizedAt || new Date().toISOString(),
        sanitizedBy: provenance.sanitizedBy || 'unknown'
      }
    };
  }

  return {
    SCHEMA_VERSION,
    MANIFEST_FILENAME,
    SUPPORTED_BROKERS,
    FIXTURE_STATUSES,
    DOCUMENT_TYPES,
    validateFixtureEntry,
    validateManifest,
    validateFilesMatchManifest,
    scanForPII,
    validateFixtureContent,
    createEmptyManifest,
    createFixtureEntry
  };
});