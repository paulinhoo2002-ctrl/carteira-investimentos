/* Import Center production contract.
 * Pure, local-only and financial-write agnostic. It creates previews and
 * confirmation gates; the financial persistence boundary remains elsewhere.
 */
(function initImportCenterCore(root, factory) {
  const foundation = root?.ImportFoundation || (typeof require === 'function' ? require('./import-foundation.js') : null);
  const api = factory(foundation);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ImportCenterCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createImportCenterCore(Foundation) {
  if (!Foundation) throw new Error('IMPORT_FOUNDATION_REQUIRED');

  const PROVIDERS = Object.freeze({
    B3: { status: 'SUPPORTED', formats: ['XLSX', 'XLS', 'CSV'] },
    INTER: { status: 'SUPPORTED', formats: ['PDF'] },
    XP: { status: 'FIXTURE_REQUIRED', formats: ['PDF'] },
    BTG: { status: 'FIXTURE_REQUIRED', formats: ['PDF'] },
    UNKNOWN: { status: 'REVIEW_REQUIRED', formats: [] },
  });
  const OPERATIONS = new Set(['BUY', 'SELL']);
  const clean = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  const upper = value => clean(value).toUpperCase();
  const valueOf = (row, names) => names.map(name => row?.[name]).find(value => value !== undefined && value !== null && String(value).trim() !== '');

  function extension(fileName = '') {
    const match = String(fileName).toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1].toUpperCase() : '';
  }

  function detectImportFile(file = {}) {
    const name = upper(file.name || file.fileName);
    const text = upper(file.text || file.content || '');
    const headers = (Array.isArray(file.headers) ? file.headers : []).map(upper);
    const haystack = [name, text, ...headers].join(' ');
    let provider = 'UNKNOWN';
    let sourceType = 'UNKNOWN';
    let confidence = 'LOW';
    if (/INTER|BANCO\s+INTER|INTER\s+DTVM/.test(haystack) && extension(file.name || file.fileName) === 'PDF') {
      provider = 'INTER'; sourceType = 'BROKERAGE_NOTE_PDF'; confidence = text ? 'HIGH' : 'MEDIUM';
    } else if (/XP\s+INVESTIMENTOS|XP\s+CORRETORA/.test(haystack)) {
      provider = 'XP'; sourceType = 'BROKERAGE_NOTE_PDF'; confidence = text ? 'HIGH' : 'MEDIUM';
    } else if (/BTG\s+PACTUAL|BTG\s+CORRETORA/.test(haystack)) {
      provider = 'BTG'; sourceType = 'BROKERAGE_NOTE_PDF'; confidence = text ? 'HIGH' : 'MEDIUM';
    } else if (/PROVENTO|RENDIMENTO|DIVIDENDO|PAGAMENTO/.test(haystack)) {
      sourceType = 'B3_DIVIDENDS_XLSX'; provider = 'B3'; confidence = headers.length || text ? 'HIGH' : 'MEDIUM';
    } else if (/MOVIMENT|NEGOCI|OPERAC|ENTRADA|SAIDA/.test(haystack)) {
      sourceType = 'B3_MOVEMENTS_XLSX'; provider = 'B3'; confidence = headers.length || text ? 'HIGH' : 'MEDIUM';
    } else if (/POSIC|CUSTOD|QUANTIDADE/.test(haystack)) {
      sourceType = 'B3_POSITION_XLSX'; provider = 'B3'; confidence = headers.length || text ? 'HIGH' : 'MEDIUM';
    }
    const providerInfo = PROVIDERS[provider] || PROVIDERS.UNKNOWN;
    return {
      provider,
      sourceType,
      extension: extension(file.name || file.fileName),
      confidence,
      support: providerInfo.status,
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

  function normalizeRecord(row = {}, context = {}) {
    const operation = upper(valueOf(row, ['operation', 'eventType', 'classification', 'buySell', 'tipoOperacao']));
    const normalizedOperation = /VENDA|SELL/.test(operation) ? 'SELL' : /COMPRA|BUY/.test(operation) ? 'BUY' : operation;
    const ticker = upper(valueOf(row, ['ticker', 'symbol', 'codigo', 'codigoNegociacao']));
    const tradeDate = Foundation.normalizeDate(valueOf(row, ['tradeDate', 'date', 'data', 'Data', 'dataPregao']));
    const quantity = Foundation.normalizeQuantity(valueOf(row, ['quantity', 'qty', 'quantidade']));
    const unitPriceCents = Foundation.normalizeMoneyCents(valueOf(row, ['unitPrice', 'price', 'preco', 'precoUnitario']));
    const grossValueCents = Foundation.normalizeMoneyCents(valueOf(row, ['grossValue', 'gross', 'total', 'valor', 'valorOperacao']));
    const normalized = {
      tradeDate, settlementDate: Foundation.normalizeDate(valueOf(row, ['settlementDate', 'dataLiquidacao'])),
      ticker, operation: normalizedOperation, quantity, unitPriceCents, grossValueCents,
      feesCents: Foundation.normalizeMoneyCents(valueOf(row, ['fees', 'feesTotal', 'taxas', 'corretagem'])),
      broker: clean(valueOf(row, ['broker', 'corretora', 'instituicao']) || context.broker),
      noteNumber: clean(valueOf(row, ['noteNumber', 'documentId', 'numeroNota']) || context.noteNumber),
      sourceType: context.sourceType || 'UNKNOWN', sourceId: clean(context.sourceId || row.sourceId),
    };
    normalized.identity = Foundation.resolveExactIdentity({ ticker: normalized.ticker });
    normalized.fingerprint = Foundation.eventFingerprint({ source: normalized.sourceType, ...normalized, unitPrice: normalized.unitPriceCents === null ? null : normalized.unitPriceCents / 100, grossValue: normalized.grossValueCents === null ? null : normalized.grossValueCents / 100 });
    return normalized;
  }

  function validateRecord(record = {}) {
    const errors = [];
    if (!record.tradeDate) errors.push('INVALID_TRADE_DATE');
    if (!record.identity) errors.push('UNKNOWN_ASSET');
    if (!OPERATIONS.has(record.operation)) errors.push('UNSUPPORTED_OPERATION');
    if (!record.quantity || Number(record.quantity) <= 0) errors.push('INVALID_QUANTITY');
    if (record.unitPriceCents === null || record.unitPriceCents < 0) errors.push('INVALID_UNIT_PRICE');
    if (record.grossValueCents === null || record.grossValueCents < 0) errors.push('INVALID_GROSS_VALUE');
    return { valid: errors.length === 0, errors };
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

  function buildPreview({ rows = [], source = {}, existing = [] } = {}) {
    const detection = source.detection || detectImportFile(source);
    const normalized = rows.map(row => normalizeRecord(row, { sourceType: detection.sourceType, sourceId: source.sourceId || source.name, broker: detection.provider }));
    const records = normalized.map(record => ({ ...record, validation: validateRecord(record), duplicate: classifyRecord(record, existing) }));
    const counts = records.reduce((acc, record) => {
      const state = !record.validation.valid ? 'REVIEW_REQUIRED' : record.duplicate.state;
      acc[state] = (acc[state] || 0) + 1; return acc;
    }, { UNIQUE: 0, EXACT_DUPLICATE: 0, PROBABLE_DUPLICATE: 0, IDENTITY_CONFLICT: 0, REVIEW_REQUIRED: 0 });
    return { detection, records, counts, writeCount: 0, requiresConfirmation: true, autoConfirm: false, financialWrite: false };
  }

  function createSession(preview, { sessionId = '', createdAt = new Date().toISOString() } = {}) {
    return { sessionId: sessionId || `import-${Foundation.sourceFingerprint({ rows: preview?.records || [], sourceType: 'IMPORT_CENTER_SESSION' })}`, createdAt, preview, status: 'PREVIEW_ONLY', confirmedAt: null };
  }

  function confirmSession(session, { confirmed = false } = {}) {
    if (!session?.preview) throw new Error('IMPORT_PREVIEW_REQUIRED');
    if (!confirmed) return { ...session, status: 'CONFIRMATION_REQUIRED', writeCount: 0, financialWrite: false };
    if (session.preview.records.some(record => !record.validation.valid || ['PROBABLE_DUPLICATE', 'IDENTITY_CONFLICT'].includes(record.duplicate.state))) return { ...session, status: 'REVIEW_REQUIRED', writeCount: 0, financialWrite: false };
    return { ...session, status: 'CONFIRMED_FOR_BOUNDARY', confirmedAt: new Date().toISOString(), writeCount: 0, financialWrite: false };
  }

  return { PROVIDERS, detectImportFile, registerParser, parserFor, normalizeRecord, validateRecord, tradeIdentity, classifyRecord, buildPreview, createSession, confirmSession };
});
