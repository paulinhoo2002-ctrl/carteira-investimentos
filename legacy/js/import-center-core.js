/* Import Center 2.0 read-only pipeline.
 * FILE -> DETECT -> PARSE -> NORMALIZE -> VALIDATE -> PREVIEW -> DEDUPE -> CONFIRM
 * Confirmation is intentionally closed here: no parser or preview writes state.
 */
(function initImportCenterCore(root, factory) {
  const foundation = root?.ImportFoundation || (typeof require === 'function' ? require('./import-foundation.js') : null);
  const api = factory(foundation);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ImportCenterCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createImportCenterCore(Foundation) {
  if (!Foundation) throw new Error('IMPORT_FOUNDATION_REQUIRED');

  const CAPABILITIES = Object.freeze({
    B3: { status: 'FULL', formats: ['XLSX', 'XLS', 'CSV'], evidence: 'B3 position, movement and income contracts in repository' },
    INTER: { status: 'FULL', formats: ['PDF'], evidence: 'Inter brokerage-note parser and deterministic fixtures in repository' },
    XP: { status: 'FIXTURE_REQUIRED', formats: ['PDF'], evidence: 'Provider detector exists; no validated sanitized layout fixture' },
    BTG: { status: 'FIXTURE_REQUIRED', formats: ['PDF'], evidence: 'Provider detector exists; no validated sanitized layout fixture' },
    UNKNOWN: { status: 'UNSUPPORTED', formats: [], evidence: 'No provider evidence' },
  });
  const PROVIDERS = Object.freeze({
    B3: { status: 'SUPPORTED', capability: 'FULL', formats: CAPABILITIES.B3.formats },
    INTER: { status: 'SUPPORTED', capability: 'FULL', formats: CAPABILITIES.INTER.formats },
    XP: { status: 'FIXTURE_REQUIRED', capability: 'FIXTURE_REQUIRED', formats: CAPABILITIES.XP.formats },
    BTG: { status: 'FIXTURE_REQUIRED', capability: 'FIXTURE_REQUIRED', formats: CAPABILITIES.BTG.formats },
    UNKNOWN: { status: 'REVIEW_REQUIRED', capability: 'UNSUPPORTED', formats: [] },
  });
  const OPERATIONS = new Set(['BUY', 'SELL', 'SUBSCRIPTION', 'TRANSFER', 'SPLIT', 'ADJUSTMENT', 'DIVIDEND', 'JCP', 'AMORTIZATION', 'FEE', 'OTHER']);
  const WRITE_COUNTERS = Object.freeze({ detect: 0, parse: 0, normalize: 0, validate: 0, preview: 0, dedupe: 0 });
  const clean = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  const upper = value => clean(value).toUpperCase();
  const valueOf = (row, names) => names.map(name => row?.[name]).find(value => value !== undefined && value !== null && String(value).trim() !== '');
  const cloneCounters = () => ({ ...WRITE_COUNTERS });

  function capabilities() { return JSON.parse(JSON.stringify(CAPABILITIES)); }

  function extension(fileName = '') {
    const match = String(fileName).toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1].toUpperCase() : '';
  }

  function detectImportFile(file = {}) {
    const fileName = file.name || file.fileName || '';
    const ext = extension(fileName);
    const name = upper(fileName);
    const text = upper(file.text || file.content || '');
    const headers = (Array.isArray(file.headers) ? file.headers : []).map(upper);
    const haystack = [name, text, ...headers].join(' ');
    const evidence = [];
    let provider = 'UNKNOWN';
    let sourceType = 'UNKNOWN';
    let confidence = 'LOW';
    if (ext === 'PDF' && /BANCO\s+INTER|INTER\s+DTVM|NOTA\s+DE\s+CORRETAGEM/.test(haystack)) {
      provider = 'INTER'; sourceType = 'BROKERAGE_NOTE_PDF'; confidence = text ? 'HIGH' : 'MEDIUM'; evidence.push('INTER');
    } else if (ext === 'PDF' && /XP\s+INVESTIMENTOS|XP\s+CORRETORA/.test(haystack)) {
      provider = 'XP'; sourceType = 'BROKERAGE_NOTE_PDF'; confidence = text ? 'HIGH' : 'MEDIUM'; evidence.push('XP');
    } else if (ext === 'PDF' && /BTG\s+PACTUAL|BTG\s+CORRETORA/.test(haystack)) {
      provider = 'BTG'; sourceType = 'BROKERAGE_NOTE_PDF'; confidence = text ? 'HIGH' : 'MEDIUM'; evidence.push('BTG');
    } else if (['XLSX', 'XLS', 'CSV'].includes(ext) && /PROVENTO|RENDIMENTO|DIVIDENDO|PAGAMENTO/.test(haystack)) {
      sourceType = 'B3_DIVIDENDS_XLSX'; provider = 'B3'; confidence = headers.length || text ? 'HIGH' : 'MEDIUM'; evidence.push('B3 income columns');
    } else if (['XLSX', 'XLS', 'CSV'].includes(ext) && /MOVIMENT|NEGOCI|OPERAC|ENTRADA|SAIDA/.test(haystack)) {
      sourceType = 'B3_MOVEMENTS_XLSX'; provider = 'B3'; confidence = headers.length || text ? 'HIGH' : 'MEDIUM'; evidence.push('B3 movement columns');
    } else if (['XLSX', 'XLS', 'CSV'].includes(ext) && /POSIC|CUSTOD|QUANTIDADE/.test(haystack)) {
      sourceType = 'B3_POSITION_XLSX'; provider = 'B3'; confidence = headers.length || text ? 'HIGH' : 'MEDIUM'; evidence.push('B3 position columns');
    }
    const providerInfo = PROVIDERS[provider] || PROVIDERS.UNKNOWN;
    return {
      provider, sourceType, extension: ext, confidence, evidence,
      reason: provider === 'UNKNOWN' ? 'Nenhuma evidência de corretora ou layout conhecido.' : `${provider}: ${evidence.join(', ')}.`,
      support: providerInfo.status, capability: providerInfo.capability,
      parser: sourceType === 'BROKERAGE_NOTE_PDF' && provider === 'INTER' ? 'BrokerageProfessional.normalizeNote' : sourceType === 'UNKNOWN' ? null : 'ProtectedImportPipeline',
      requiresReview: providerInfo.status !== 'SUPPORTED' || sourceType === 'UNKNOWN',
      contentInspected: Boolean(text || headers.length),
    };
  }

  function registerParser(registry, sourceType, parser, { provider = '' } = {}) {
    if (!registry || typeof registry !== 'object' || !sourceType || typeof parser !== 'function') throw new Error('INVALID_PARSER_REGISTRATION');
    return { ...registry, [sourceType]: { parser, provider: upper(provider), sourceType } };
  }

  function parserFor(registry = {}, detection = {}) {
    const entry = registry[detection.sourceType];
    return entry && typeof entry.parser === 'function' ? entry : null;
  }

  function operationOf(row) {
    const raw = upper(valueOf(row, ['operation', 'eventType', 'classification', 'buySell', 'tipoOperacao', 'tipo']));
    if (/VENDA|SELL/.test(raw)) return 'SELL';
    if (/COMPRA|BUY/.test(raw)) return 'BUY';
    if (/DIVIDENDO|DIVIDEND|PROVENTO/.test(raw)) return 'DIVIDEND';
    if (/JCP|JUROS\s+SOBRE\s+CAPITAL/.test(raw)) return 'JCP';
    if (/SUBSCRI/.test(raw)) return 'SUBSCRIPTION';
    if (/TRANSFER/.test(raw)) return 'TRANSFER';
    if (/SPLIT|DESDOBR/.test(raw)) return 'SPLIT';
    if (/AJUST|BONIFIC/.test(raw)) return 'ADJUSTMENT';
    if (/AMORT/.test(raw)) return 'AMORTIZATION';
    if (/TAXA|FEE|CORRETAGEM/.test(raw)) return 'FEE';
    return raw || 'OTHER';
  }

  function normalizeRecord(row = {}, context = {}) {
    const operation = operationOf(row);
    const ticker = upper(valueOf(row, ['ticker', 'symbol', 'codigo', 'codigoNegociacao']));
    const tradeDate = Foundation.normalizeDate(valueOf(row, ['tradeDate', 'date', 'data', 'Data', 'dataPregao', 'paymentDate']));
    const quantity = Foundation.normalizeQuantity(valueOf(row, ['quantity', 'qty', 'quantidade']));
    const unitPriceCents = Foundation.normalizeMoneyCents(valueOf(row, ['unitPrice', 'price', 'preco', 'precoUnitario']));
    const grossValueCents = Foundation.normalizeMoneyCents(valueOf(row, ['grossValue', 'gross', 'total', 'valor', 'valorOperacao', 'value']));
    const normalized = {
      tradeDate, settlementDate: Foundation.normalizeDate(valueOf(row, ['settlementDate', 'dataLiquidacao'])),
      ticker, operation, quantity, unitPriceCents, grossValueCents,
      feesCents: Foundation.normalizeMoneyCents(valueOf(row, ['fees', 'feesTotal', 'taxas', 'corretagem'])),
      broker: clean(valueOf(row, ['broker', 'corretora', 'instituicao']) || context.broker),
      noteNumber: clean(valueOf(row, ['noteNumber', 'documentId', 'numeroNota']) || context.noteNumber),
      sourceType: context.sourceType || 'UNKNOWN', sourceId: clean(context.sourceId || row.sourceId),
      sourceDocumentType: clean(context.sourceDocumentType || row.sourceDocumentType || context.sourceType || 'UNKNOWN'),
    };
    normalized.identity = Foundation.resolveExactIdentity({ ticker: normalized.ticker, isin: row.isin, assetId: row.assetId });
    normalized.provenance = {
      broker: normalized.broker || 'UNKNOWN', sourceType: normalized.sourceType, sourceDocumentType: normalized.sourceDocumentType,
      sourceFileName: clean(context.sourceFileName || row.sourceFileName), sourceRow: Number.isFinite(Number(context.sourceRow ?? row.sourceRow)) ? Number(context.sourceRow ?? row.sourceRow) : null,
      sourceReference: clean(context.sourceReference || row.sourceReference), hasProvenance: Boolean(normalized.broker && normalized.sourceType && (context.sourceFileName || row.sourceFileName || context.sourceReference || normalized.noteNumber)),
    };
    normalized.fingerprint = Foundation.eventFingerprint({ source: normalized.sourceType, ...normalized, unitPrice: normalized.unitPriceCents === null ? null : normalized.unitPriceCents / 100, grossValue: normalized.grossValueCents === null ? null : normalized.grossValueCents / 100 });
    return normalized;
  }

  function validateRecord(record = {}) {
    const errors = [];
    const warnings = [];
    const info = [];
    if (!record.tradeDate) errors.push('INVALID_TRADE_DATE');
    if (!record.identity && !['FEE', 'OTHER'].includes(record.operation)) errors.push('UNKNOWN_ASSET');
    if (!OPERATIONS.has(record.operation)) errors.push('UNSUPPORTED_OPERATION');
    if (['BUY', 'SELL', 'SUBSCRIPTION'].includes(record.operation) && (!record.quantity || Number(record.quantity) <= 0)) errors.push('INVALID_QUANTITY');
    if (['BUY', 'SELL'].includes(record.operation) && (record.unitPriceCents === null || record.unitPriceCents < 0)) errors.push('INVALID_UNIT_PRICE');
    if (['BUY', 'SELL', 'DIVIDEND', 'JCP', 'FEE', 'AMORTIZATION'].includes(record.operation) && (record.grossValueCents === null || record.grossValueCents < 0)) errors.push('INVALID_GROSS_VALUE');
    if (!record.provenance?.hasProvenance) warnings.push('MISSING_PROVENANCE');
    if (record.operation === 'OTHER') warnings.push('UNCLASSIFIED_OPERATION');
    if (record.operation === 'TRANSFER') info.push('TRANSFER_DOES_NOT_CHANGE_VALUATION');
    if (record.operation === 'DIVIDEND' || record.operation === 'JCP') info.push('REFERENCE_INCOME_REQUIRES_AUTHORITY_REVIEW');
    return { valid: errors.length === 0, status: errors.length ? 'ERROR' : warnings.length ? 'WARNING' : info.length ? 'INFO' : 'OK', errors, warnings, info };
  }

  function tradeIdentity(record = {}) {
    return [record.tradeDate, record.operation, record.identity, record.quantity, record.unitPriceCents, record.grossValueCents, upper(record.broker), record.noteNumber].join('|');
  }

  function classifyRecord(record, existing = []) {
    const exact = existing.find(item => String(item?.fingerprint || '') === String(record?.fingerprint || '') || tradeIdentity(item) === tradeIdentity(record));
    if (exact) return { state: 'EXACT_DUPLICATE', matchedId: exact.id || exact.importRecordId || null };
    const similar = existing.find(item => item?.tradeDate === record.tradeDate && item?.operation === record.operation && item?.identity === record.identity && String(item?.quantity) === String(record.quantity));
    if (similar && (similar.unitPriceCents !== record.unitPriceCents || similar.grossValueCents !== record.grossValueCents)) return { state: 'IDENTITY_CONFLICT', matchedId: similar.id || similar.importRecordId || null };
    if (similar) return { state: 'PROBABLE_DUPLICATE', matchedId: similar.id || similar.importRecordId || null };
    return { state: 'UNIQUE', matchedId: null };
  }

  function createDedupeIndex(existing = []) {
    const index = { exact: new Map(), similar: new Map() };
    (Array.isArray(existing) ? existing : []).forEach(item => {
      const fingerprint = String(item?.fingerprint || '');
      const exactKey = fingerprint || tradeIdentity(item);
      if (exactKey) index.exact.set(exactKey, item);
      const similarKey = [item?.tradeDate, item?.operation, item?.identity, item?.quantity].join('|');
      if (!index.similar.has(similarKey)) index.similar.set(similarKey, []);
      index.similar.get(similarKey).push(item);
    });
    return index;
  }

  function classifyIndexed(record, index) {
    const exact = index.exact.get(String(record?.fingerprint || '')) || index.exact.get(tradeIdentity(record));
    if (exact) return { state: 'EXACT_DUPLICATE', matchedId: exact.id || exact.importRecordId || null };
    const similarKey = [record?.tradeDate, record?.operation, record?.identity, record?.quantity].join('|');
    const similar = index.similar.get(similarKey)?.[0];
    if (similar && (similar.unitPriceCents !== record.unitPriceCents || similar.grossValueCents !== record.grossValueCents)) return { state: 'IDENTITY_CONFLICT', matchedId: similar.id || similar.importRecordId || null };
    if (similar) return { state: 'PROBABLE_DUPLICATE', matchedId: similar.id || similar.importRecordId || null };
    return { state: 'UNIQUE', matchedId: null };
  }

  function addToDedupeIndex(record, index) {
    const exactKey = String(record?.fingerprint || '') || tradeIdentity(record);
    if (exactKey && !index.exact.has(exactKey)) index.exact.set(exactKey, record);
    const similarKey = [record?.tradeDate, record?.operation, record?.identity, record?.quantity].join('|');
    if (!index.similar.has(similarKey)) index.similar.set(similarKey, []);
    index.similar.get(similarKey).push(record);
  }

  function batchFingerprint(records = [], detection = {}) {
    return Foundation.sourceFingerprint({ sourceType: detection.sourceType, broker: detection.provider, rows: records.map(record => ({ ...record, source: detection.sourceType, fileName: '' })) });
  }

  function buildPreview({ rows = [], source = {}, existing = [] } = {}) {
    const detection = source.detection || detectImportFile(source);
    const safeRows = Array.isArray(rows) ? rows : [];
    const normalized = safeRows.map((row, index) => normalizeRecord(row, { sourceType: detection.sourceType, sourceId: source.sourceId || source.name, sourceFileName: source.name || source.fileName, sourceDocumentType: source.sourceDocumentType, sourceRow: row.sourceRow ?? index + 1, broker: detection.provider, noteNumber: source.noteNumber }));
    const dedupeIndex = createDedupeIndex(existing);
    const records = normalized.map(record => {
      const duplicate = classifyIndexed(record, dedupeIndex);
      if (duplicate.state === 'UNIQUE') addToDedupeIndex(record, dedupeIndex);
      return { ...record, validation: validateRecord(record), duplicate };
    });
    const counts = records.reduce((acc, record) => {
      const state = !record.validation.valid ? 'REVIEW_REQUIRED' : record.duplicate.state;
      acc[state] = (acc[state] || 0) + 1; return acc;
    }, { UNIQUE: 0, EXACT_DUPLICATE: 0, PROBABLE_DUPLICATE: 0, IDENTITY_CONFLICT: 0, REVIEW_REQUIRED: 0 });
    const status = !safeRows.length ? 'EMPTY' : detection.provider === 'UNKNOWN' ? 'REVIEW_REQUIRED' : counts.REVIEW_REQUIRED || counts.IDENTITY_CONFLICT ? 'WARNING' : 'READY_FOR_REVIEW';
    return {
      detection, records, counts, status, batchFingerprint: batchFingerprint(records, detection),
      summary: { total: records.length, valid: records.filter(row => row.validation.valid).length, warnings: records.filter(row => row.validation.warnings.length).length, errors: records.filter(row => !row.validation.valid).length, duplicates: counts.EXACT_DUPLICATE, potentialDuplicates: counts.PROBABLE_DUPLICATE, conflicts: counts.IDENTITY_CONFLICT, unsupported: detection.capability === 'UNSUPPORTED' || detection.capability === 'FIXTURE_REQUIRED' ? records.length : 0 },
      writeCount: 0, writeCounters: cloneCounters(), requiresConfirmation: true, autoConfirm: false, financialWrite: false, previewOnly: true,
    };
  }

  function createSession(preview, { sessionId = '', createdAt = new Date().toISOString() } = {}) {
    return { sessionId: sessionId || `import-${Foundation.sourceFingerprint({ rows: preview?.records || [], sourceType: 'IMPORT_CENTER_SESSION' })}`, createdAt, preview, status: 'PREVIEW_ONLY', confirmedAt: null };
  }

  function confirmSession(session, { confirmed = false } = {}) {
    if (!session?.preview) throw new Error('IMPORT_PREVIEW_REQUIRED');
    if (!confirmed) return { ...session, status: 'CONFIRMATION_REQUIRED', writeCount: 0, financialWrite: false };
    return { ...session, status: 'CONFIRMATION_BLOCKED', confirmedAt: null, writeCount: 0, financialWrite: false, reason: 'REAL_IMPORT_CONFIRMATION_NOT_AUTHORIZED' };
  }

  return { PROVIDERS, OPERATIONS, capabilities, detectImportFile, registerParser, parserFor, normalizeRecord, validateRecord, tradeIdentity, classifyRecord, batchFingerprint, buildPreview, createSession, confirmSession };
});
