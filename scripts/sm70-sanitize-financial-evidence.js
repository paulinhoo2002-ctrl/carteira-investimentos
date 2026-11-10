'use strict';

const fs = require('node:fs');
const path = require('node:path');

const VERSION = 1;
const MAX_INPUT_BYTES = 2 * 1024 * 1024;
const REPOSITORY_ROOT = path.resolve(__dirname, '..');
const ALLOWED_ROOT_KEYS = new Set(['inputVersion', 'asOfDate', 'coverage', 'sources', 'positions', 'openingPositions', 'movements', 'corporateEvents']);
const SOURCE_KINDS = new Set(['B3', 'BROKER', 'APP_LEDGER', 'CUSTODY', 'OTHER']);
const MOVEMENT_TYPES = new Set(['BUY', 'SELL', 'TRANSFER', 'OTHER', 'UNKNOWN']);
const CORPORATE_EVENT_TYPES = new Set(['BONIFICATION', 'SPLIT', 'REVERSE_SPLIT', 'MERGER', 'SPINOFF', 'OTHER', 'UNKNOWN']);
const RECORD_STATUSES = new Set(['CONFIRMED', 'PENDING', 'CANCELLED', 'ESTIMATED', 'UNKNOWN']);
const DUPLICATE_STATES = new Set(['NONE', 'RESOLVED', 'POSSIBLE_DUPLICATE', 'CONFLICT', 'UNKNOWN']);

function fail(message) {
  throw new Error(message);
}

function asObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(label + ' deve ser um objeto.');
  return value;
}

function asArray(value, label) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail(label + ' deve ser uma lista.');
  return value;
}

function sourceKey(value, label) {
  if (typeof value !== 'string' || !value.trim() || value.length > 160 || /[\u0000-\u001f]/.test(value)) fail(label + ' inválido.');
  return value.trim();
}

function date(value, label, optional = true) {
  if (value === undefined || value === null || value === '') {
    if (optional) return null;
    fail(label + ' ausente.');
  }
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) fail(label + ' deve usar AAAA-MM-DD.');
  const stamp = Date.parse(value + 'T00:00:00.000Z');
  if (!Number.isFinite(stamp) || new Date(stamp).toISOString().slice(0, 10) !== value) fail(label + ' inválido.');
  return value;
}

function numberOrNull(value, label) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) fail(label + ' deve ser número finito não negativo ou ausente.');
  return value;
}

function enumValue(value, allowed) {
  const normalized = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return allowed.has(normalized) ? normalized : 'UNKNOWN';
}

function aliases(records, field, prefix) {
  const result = new Map();
  for (const record of records) {
    const key = sourceKey(record?.[field], field);
    if (!result.has(key)) result.set(key, prefix + String(result.size + 1).padStart(3, '0'));
  }
  return result;
}

function aliasFor(map, value, label) {
  const key = sourceKey(value, label);
  const alias = map.get(key);
  if (!alias) fail(label + ' sem correspondência na entrada.');
  return alias;
}

function assertOutsideRepository(filePath, repoRoot, label) {
  const relative = path.relative(repoRoot, filePath);
  if (relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) {
    fail(label + ' deve ficar fora do repositório.');
  }
}

function sanitizeEvidence(input) {
  asObject(input, 'Entrada');
  if (input.inputVersion !== VERSION) fail('inputVersion deve ser 1.');
  for (const key of Object.keys(input)) if (!ALLOWED_ROOT_KEYS.has(key)) fail('Campo superior não permitido: ' + key);

  const sources = asArray(input.sources, 'sources');
  const positions = asArray(input.positions, 'positions');
  const openingPositions = asArray(input.openingPositions, 'openingPositions');
  const movements = asArray(input.movements, 'movements');
  const corporateEvents = asArray(input.corporateEvents, 'corporateEvents');
  if (!sources.length) fail('Informe ao menos uma fonte local identificada por alias.');
  const sourceAliases = aliases(sources, 'key', 'source-');
  const assetRecords = [...positions, ...openingPositions, ...movements, ...corporateEvents];
  const assetAliases = aliases(assetRecords, 'assetKey', 'asset-');
  const eventRecords = [...movements, ...corporateEvents];
  const eventAliases = aliases(eventRecords, 'eventKey', 'event-');
  const periodStart = date(input.coverage?.periodStart, 'coverage.periodStart');
  const periodEnd = date(input.coverage?.periodEnd, 'coverage.periodEnd');
  if (periodStart && periodEnd && periodStart > periodEnd) fail('Período de cobertura invertido.');

  const cleanSources = sources.map((item, index) => {
    asObject(item, 'sources[' + index + ']');
    const key = sourceKey(item.key, 'source.key');
    return {
      id: sourceAliases.get(key),
      kind: enumValue(item.kind, SOURCE_KINDS),
      periodStart: date(item.periodStart, 'source.periodStart'),
      periodEnd: date(item.periodEnd, 'source.periodEnd'),
    };
  });
  const cleanPositions = positions.map((item, index) => {
    asObject(item, 'positions[' + index + ']');
    return {
      assetId: aliasFor(assetAliases, item.assetKey, 'position.assetKey'),
      ticker: typeof item.ticker === 'string' && /^(?:[A-Z]{4,6}\d{1,2}|CDI|IPCA|SELIC|TESOURO|BTC|ETH|BRL|USD)$/i.test(item.ticker.trim()) ? item.ticker.trim().toUpperCase() : null,
      asOfDate: date(item.asOfDate, 'position.asOfDate'),
      quantity: numberOrNull(item.quantity, 'position.quantity'),
      averagePrice: numberOrNull(item.averagePrice, 'position.averagePrice'),
      sourceId: aliasFor(sourceAliases, item.sourceKey, 'position.sourceKey'),
      status: enumValue(item.status, RECORD_STATUSES),
    };
  });
  const cleanOpening = openingPositions.map((item, index) => {
    asObject(item, 'openingPositions[' + index + ']');
    return {
      assetId: aliasFor(assetAliases, item.assetKey, 'openingPosition.assetKey'),
      asOfDate: date(item.asOfDate, 'openingPosition.asOfDate'),
      quantity: numberOrNull(item.quantity, 'openingPosition.quantity'),
      averagePrice: numberOrNull(item.averagePrice, 'openingPosition.averagePrice'),
      sourceId: aliasFor(sourceAliases, item.sourceKey, 'openingPosition.sourceKey'),
      status: enumValue(item.status, RECORD_STATUSES),
    };
  });
  function cleanEvent(item, index, collection, types) {
    asObject(item, collection + '[' + index + ']');
    const relatedEventId = item.relatedEventKey == null || item.relatedEventKey === ''
      ? null
      : aliasFor(eventAliases, item.relatedEventKey, collection + '.relatedEventKey');
    return {
      id: aliasFor(eventAliases, item.eventKey, collection + '.eventKey'),
      sourceId: aliasFor(sourceAliases, item.sourceKey, collection + '.sourceKey'),
      assetId: aliasFor(assetAliases, item.assetKey, collection + '.assetKey'),
      occurredOn: date(item.occurredOn, collection + '.occurredOn'),
      type: enumValue(item.type, types),
      status: enumValue(item.status, RECORD_STATUSES),
      quantity: numberOrNull(item.quantity, collection + '.quantity'),
      unitPrice: numberOrNull(item.unitPrice, collection + '.unitPrice'),
      amount: numberOrNull(item.amount, collection + '.amount'),
      ratioNumerator: numberOrNull(item.ratioNumerator, collection + '.ratioNumerator'),
      ratioDenominator: numberOrNull(item.ratioDenominator, collection + '.ratioDenominator'),
      duplicateState: enumValue(item.duplicateState, DUPLICATE_STATES),
      conflictState: enumValue(item.conflictState, DUPLICATE_STATES),
      relatedEventId,
    };
  }
  const cleanMovements = movements.map((item, index) => cleanEvent(item, index, 'movements', MOVEMENT_TYPES));
  const cleanCorporateEvents = corporateEvents.map((item, index) => cleanEvent(item, index, 'corporateEvents', CORPORATE_EVENT_TYPES));

  return {
    schemaVersion: VERSION,
    sanitization: {
      status: 'SANITIZED_UNVERIFIED',
      proofStatus: 'UNVERIFIED',
      note: 'Aliases e campos permitidos reduzem dados pessoais; não comprovam autenticidade, identidade nem cobertura histórica.',
    },
    asOfDate: date(input.asOfDate, 'asOfDate'),
    coverage: { status: 'INDETERMINADO', periodStart, periodEnd },
    sources: cleanSources,
    positions: cleanPositions,
    openingPositions: cleanOpening,
    movements: cleanMovements,
    corporateEvents: cleanCorporateEvents,
  };
}

function sanitizeFile(inputPath, outputPath, options = {}) {
  if (typeof inputPath !== 'string' || typeof outputPath !== 'string') fail('Informe --input e --output explícitos.');
  const repoRoot = path.resolve(options.repositoryRoot || REPOSITORY_ROOT);
  const inputRealPath = fs.realpathSync(inputPath);
  assertOutsideRepository(inputRealPath, repoRoot, 'Entrada');
  const outputParent = fs.realpathSync(path.dirname(path.resolve(outputPath)));
  const outputRealPath = path.join(outputParent, path.basename(outputPath));
  assertOutsideRepository(outputRealPath, repoRoot, 'Saída');
  if (fs.existsSync(outputRealPath)) fail('Saída já existe; nenhum arquivo foi sobrescrito.');
  const stat = fs.statSync(inputRealPath);
  if (!stat.isFile() || stat.size > MAX_INPUT_BYTES) fail('Entrada não é arquivo JSON ou excede 2 MiB.');
  const raw = fs.readFileSync(inputRealPath, 'utf8');
  const sanitized = sanitizeEvidence(JSON.parse(raw));
  fs.writeFileSync(outputRealPath, JSON.stringify(sanitized, null, 2) + '\n', { flag: 'wx' });
  return outputRealPath;
}

function usage() {
  return [
    'Uso: node scripts/sm70-sanitize-financial-evidence.js --input <JSON-normalizado> --output <novo-JSON-fora-do-repositorio>',
    'A entrada deve conter inputVersion:1, sources, positions, openingPositions, movements, corporateEvents e coverage.',
    'Campos JSON: inputVersion:1; coverage:{periodStart,periodEnd}; sources:[{key,kind,periodStart,periodEnd}]; positions:[{assetKey,sourceKey,ticker,asOfDate,quantity,averagePrice,status}].',
    'Opening positions: {assetKey,sourceKey,asOfDate,quantity,averagePrice,status}; events: {eventKey,sourceKey,assetKey,occurredOn,type,status,quantity,unitPrice,amount,ratioNumerator,ratioDenominator,duplicateState,conflictState,relatedEventKey}.',
    'O programa lê somente o caminho explícito, não sobrescreve saída, remove IDs/nomes livres e sempre marca cobertura INDETERMINADO/UNVERIFIED.',
    'Não interpreta PDF/XLSX nem autentica documentos; não use backup completo nem arquivo com dados de conta.',
  ].join('\n');
}

function main(args) {
  if (args.includes('--help')) {
    process.stdout.write(usage() + '\n');
    return;
  }
  const inputIndex = args.indexOf('--input');
  const outputIndex = args.indexOf('--output');
  if (inputIndex < 0 || outputIndex < 0 || !args[inputIndex + 1] || !args[outputIndex + 1]) fail(usage());
  const output = sanitizeFile(args[inputIndex + 1], args[outputIndex + 1]);
  process.stdout.write('Arquivo sanitizado local gerado: ' + output + '\n');
  process.stdout.write('Estado de evidência: UNVERIFIED; nenhuma posição foi alterada.\n');
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write('Falha segura: ' + error.message + '\n');
    process.exitCode = 1;
  }
}

module.exports = { sanitizeEvidence, sanitizeFile, usage };
