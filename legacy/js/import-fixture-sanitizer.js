/* Fixture sanitization workflow for Import Center.
 * Safely converts real broker documents into reusable test fixtures.
 * No PII in committed fixtures. No automatic uploads.
 */
(function initImportFixtureSanitizer(root, factory) {
  const api = factory();
  if (root) root.ImportFixtureSanitizer = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : null, function createImportFixtureSanitizerApi() {
  const PII_PATTERNS = Object.freeze([
    { name: 'CPF', regex: /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, replacement: '[CPF_REDACTED]', severity: 'HIGH' },
    { name: 'CNPJ', regex: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, replacement: '[CNPJ_REDACTED]', severity: 'HIGH' },
    { name: 'EMAIL', regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi, replacement: '[EMAIL_REDACTED]', severity: 'MEDIUM' },
    { name: 'PHONE_BR', regex: /\b\(?\d{2}\)?\s?\d{4,5}-?\d{4}\b/g, replacement: '[PHONE_REDACTED]', severity: 'MEDIUM' },
    { name: 'ACCOUNT_NUMBER', regex: /\b(?:conta|conta\s*corrente|account)\s*[:\-]?\s*\d{4,}\b/gi, replacement: '[ACCOUNT_REDACTED]', severity: 'HIGH' },
    { name: 'AGENCY_NUMBER', regex: /\b(?:ag[eê]ncia|agency)\s*[:\-]?\s*\d{4,}\b/gi, replacement: '[AGENCY_REDACTED]', severity: 'HIGH' },
    { name: 'CPF_LABEL', regex: /\b(cpf|cpf\/cnpj)\s*[:\-]?\s*\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/gi, replacement: '$1: [CPF_REDACTED]', severity: 'HIGH' },
    { name: 'CNPJ_LABEL', regex: /\b(cnpj)\s*[:\-]?\s*\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/gi, replacement: '$1: [CNPJ_REDACTED]', severity: 'HIGH' },
    { name: 'CLIENT_ID', regex: /\b(?:c[oó]digo\s*do\s*cliente|client\s*id|id\s*do\s*cliente)\s*[:\-]?\s*[A-Za-z0-9]{6,}\b/gi, replacement: '$1: [CLIENT_ID_REDACTED]', severity: 'HIGH' },
    { name: 'DOCUMENT_NUMBER', regex: /\b(?:n[úu]mero|documento|doc)\s*(?:da\s+nota|de\s+corretagem)?\s*[:\-]?\s*\d{6,}\b/gi, replacement: '$1: [DOC_NUMBER_REDACTED]', severity: 'HIGH' },
  ]);

  const PRESERVE_PATTERNS = Object.freeze([
    { name: 'MONETARY_BRL', regex: /R\$\s*[\d.,]+/g },
    { name: 'DATE_BR', regex: /\b\d{2}\/\d{2}\/\d{4}\b/g },
    { name: 'TICKER', regex: /\b[A-Z]{4}\d{1,2}\b/g },
    { name: 'PERCENTAGE', regex: /\b\d+[.,]?\d*\s*%\b/g },
  ]);

  function sanitizeContent(content, options = {}) {
    const { dryRun = true, customPatterns = [], preservePatterns = [] } = options;
    let sanitized = content;
    const redactions = [];
    const allPatterns = [...PII_PATTERNS, ...customPatterns];
    for (const pattern of allPatterns) {
      const matches = [...sanitized.matchAll(pattern.regex)];
      if (matches.length > 0) {
        redactions.push({ pattern: pattern.name, count: matches.length, samples: matches.slice(0, 3).map(m => m[0]) });
        if (!dryRun) {
          sanitized = sanitized.replace(pattern.regex, pattern.replacement);
        }
      }
    }
    return { original: content, sanitized: dryRun ? content : sanitized, redactions, dryRun };
  }

  function analyzeContent(content) {
    const findings = [];
    for (const pattern of PII_PATTERNS) {
      const matches = [...content.matchAll(pattern.regex)];
      if (matches.length > 0) {
        findings.push({ pattern: pattern.name, severity: pattern.severity, count: matches.length, samples: matches.slice(0, 3).map(m => m[0]) });
      }
    }
    for (const pattern of PRESERVE_PATTERNS) {
      const matches = [...content.matchAll(pattern.regex)];
      if (matches.length > 0) {
        findings.push({ pattern: pattern.name, severity: 'PRESERVE', count: matches.length, samples: matches.slice(0, 3).map(m => m[0]) });
      }
    }
    return findings;
  }

  function generateFixtureId(broker, documentType, sequence) {
    const brokerCode = broker.toUpperCase().replace(/\s+/g, '_');
    const typeCode = documentType.toUpperCase().replace(/_/g, '-');
    const seq = String(sequence).padStart(3, '0');
    return `${brokerCode}_${typeCode}_${seq}.json`;
  }

  function createSanitizationReport(originalPath, fixtureId, findings, redactions, options) {
    return {
      fixtureId,
      sourcePath: originalPath,
      timestamp: new Date().toISOString(),
      dryRun: options.dryRun ?? true,
      piiFindings: findings,
      redactionsApplied: redactions,
      fileSize: options.originalSize || 0,
      sanitizationVersion: '1.0',
      policy: 'conservative',
      warnings: options.warnings || []
    };
  }

  function validateSanitizedOutput(original, sanitized) {
    const warnings = [];
    if (original.length > 0 && sanitized.length === 0) {
      warnings.push('SANITIZATION_EMPTIED_CONTENT');
    }
    if (original.length > sanitized.length * 10) {
      warnings.push('EXCESSIVE_REDUCTION_POSSIBLE_OVER_REDACTION');
    }
    const originalMonetary = (original.match(/R\$\s*[\d.,]+/g) || []).length;
    const sanitizedMonetary = (sanitized.match(/R\$\s*[\d.,]+/g) || []).length;
    if (originalMonetary > 0 && sanitizedMonetary === 0) {
      warnings.push('ALL_MONETARY_VALUES_REMOVED');
    }
    return warnings;
  }

  function detectBrokerFromContent(content) {
    const upper = content.toUpperCase();
    if (/BANCO\s+INTER|INTER\s+DTVM|INTER\s+CORRETORA/.test(upper)) return 'INTER';
    if (/XP\s+INVESTIMENTOS|XP\s+CORRETORA/.test(upper)) return 'XP';
    if (/BTG\s+PACTUAL|BTG\s+CORRETORA/.test(upper)) return 'BTG';
    if (/B3\s+|BM&FBOVESPA|BOVESPA/.test(upper)) return 'B3';
    return 'UNKNOWN';
  }

  function detectDocumentTypeFromContent(content, extension, headers = []) {
    const upper = content.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const ext = extension?.toUpperCase();
    const upperHeaders = (Array.isArray(headers) ? headers : []).map(h => h.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
    const haystack = [upper, ...upperHeaders].join(' ');
    if (ext === 'PDF' && /NOTA\s+DE\s+CORRETAGEM|BROKERAGE\s+NOTE/.test(upper)) return 'BROKERAGE_NOTE_PDF';
    if (['XLSX', 'XLS', 'CSV'].includes(ext)) {
      if (/PROVENTO|RENDIMENTO|DIVIDENDO|JCP|PAGAMENTO/.test(haystack)) return 'B3_DIVIDENDS_XLSX';
      if (/MOVIMENT|NEGOCI|OPERAC|ENTRADA|SAIDA/.test(haystack)) return 'B3_MOVEMENTS_XLSX';
      if (/POSIC|CUSTOD|QUANTIDADE/.test(haystack)) return 'B3_POSITION_XLSX';
      if (/EVENTO|CORPORAT|DESDOBR|BONIFIC|AMORT/.test(haystack)) return 'B3_CORPORATE_EVENTS_XLSX';
    }
    return 'UNKNOWN';
  }

  return {
    PII_PATTERNS,
    PRESERVE_PATTERNS,
    sanitizeContent,
    analyzeContent,
    generateFixtureId,
    createSanitizationReport,
    validateSanitizedOutput,
    detectBrokerFromContent,
    detectDocumentTypeFromContent
  };
});