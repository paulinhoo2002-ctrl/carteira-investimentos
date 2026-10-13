const { createHash } = require('node:crypto');

const normalizeText = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const sha256 = value => createHash('sha256').update(String(value)).digest('hex');

function classifyMovement(value) {
  const text = normalizeText(value).replace(/[^a-z0-9]+/g, ' ').trim();
  if (!text) return { kind: 'UNKNOWN', incomeStatus: 'UNKNOWN', reasonCode: 'EMPTY_MOVEMENT' };
  if (/\bresgate\b|\bredemption\b|\bredeem\b/.test(text)) return { kind: 'RF_REDEMPTION_CANDIDATE', incomeStatus: 'EXCLUDED', reasonCode: 'REDEMPTION_REQUIRES_PRODUCT_EVIDENCE' };
  if (/previst|esperad|declarad|provisionad|anunciad|a receber/.test(text)) return { kind: 'EXPECTED_INCOME_CANDIDATE', incomeStatus: 'EXPECTED', reasonCode: 'NOT_RECEIVED' };
  if (/transfer.*(?:liquid|settlement)|(?:liquid|settlement).*transfer/.test(text)) return { kind: 'SETTLEMENT_CANDIDATE', incomeStatus: 'EXCLUDED', reasonCode: 'SETTLEMENT_DIRECTION_UNKNOWN' };
  if (/transferencia.*(entrada|recebid|credito|inbound)|(?:entrada|recebimento).*transferencia/.test(text)) return { kind: 'TRANSFER_IN', incomeStatus: 'EXCLUDED', reasonCode: 'TRANSFER_DIRECTION_EXPLICIT' };
  if (/transferencia.*(saida|enviad|debito|outbound)|(?:saida|envio).*transferencia/.test(text)) return { kind: 'TRANSFER_OUT', incomeStatus: 'EXCLUDED', reasonCode: 'TRANSFER_DIRECTION_EXPLICIT' };
  if (/transfer|custodia/.test(text)) return { kind: 'TRANSFER_CANDIDATE', incomeStatus: 'EXCLUDED', reasonCode: 'TRANSFER_DIRECTION_UNKNOWN' };
  if (/\bjcp\b|juros.{0,40}capital/.test(text)) return { kind: 'JCP', incomeStatus: 'RECEIVED', reasonCode: 'EXPLICIT_MOVEMENT_LABEL' };
  if (/\bdividendos?\b|\bdividends?\b/.test(text)) return { kind: 'DIVIDEND', incomeStatus: 'RECEIVED', reasonCode: 'EXPLICIT_MOVEMENT_LABEL' };
  if (/amortiz/.test(text)) return { kind: 'AMORTIZATION_CANDIDATE', incomeStatus: 'EXCLUDED', reasonCode: 'PRINCIPAL_OR_INCOME_UNRESOLVED' };
  if (/restituicao.*capital|retorno.*capital/.test(text)) return { kind: 'CAPITAL_RETURN_CANDIDATE', incomeStatus: 'EXCLUDED', reasonCode: 'PRINCIPAL_RETURN_NOT_INCOME' };
  if (/aplicac|investimento.*renda fixa/.test(text)) return { kind: 'RF_APPLICATION_CANDIDATE', incomeStatus: 'EXCLUDED', reasonCode: 'PRODUCT_CONTEXT_REQUIRED' };
  if (/\bcompra\b.*\bvenda\b|\bvenda\b.*\bcompra\b/.test(text)) return { kind: 'UNKNOWN', incomeStatus: 'EXCLUDED', reasonCode: 'CONFLICTING_MOVEMENT_LABELS' };
  if (/\bcompra\b|\bbuy\b/.test(text)) return { kind: 'BUY', incomeStatus: 'EXCLUDED', reasonCode: 'EXPLICIT_MOVEMENT_LABEL' };
  if (/\bvenda\b|\bsell\b|alienacao/.test(text)) return { kind: 'SELL', incomeStatus: 'EXCLUDED', reasonCode: 'EXPLICIT_MOVEMENT_LABEL' };
  if (/rendimento|provento|juros/.test(text)) return { kind: 'INCOME_CANDIDATE', incomeStatus: 'UNKNOWN', reasonCode: 'INCOME_SUBTYPE_UNRESOLVED' };
  if (/\btaxa\b|\btarifa\b|\bfee\b/.test(text)) return { kind: 'FEE_CANDIDATE', incomeStatus: 'EXCLUDED', reasonCode: 'FEE_REQUIRES_REVIEW' };
  if (/\bir\b|\biof\b|\bimposto\b|\btax\b/.test(text)) return { kind: 'TAX_CANDIDATE', incomeStatus: 'EXCLUDED', reasonCode: 'TAX_REQUIRES_REVIEW' };
  if (/split|grupamento|desdobro|bonificacao|cisao|fusao|incorporacao|subscricao/.test(text)) return { kind: 'CORPORATE_EVENT_CANDIDATE', incomeStatus: 'EXCLUDED', reasonCode: 'CORPORATE_EVENT_REQUIRES_EVIDENCE' };
  return { kind: 'UNKNOWN', incomeStatus: 'UNKNOWN', reasonCode: 'UNCLASSIFIED_MOVEMENT' };
}

function rowFingerprint(row = {}) {
  if (/^[a-f0-9]{64}$/i.test(String(row.rowFingerprint || ''))) return String(row.rowFingerprint).toLowerCase();
  const fields = ['date', 'movement', 'assetKey', 'quantity', 'unitPriceCents', 'amountCents', 'eventId'];
  return sha256(fields.map(key => `${key}=${normalizeText(row[key])}`).join('|'));
}

function canonicalizeSources(sources = []) {
  const sourceList = Array.isArray(sources) ? sources : [];
  const primaries = sourceList.filter(source => source?.role === 'PRIMARY');
  if (primaries.length !== 1) throw new Error('EXACTLY_ONE_PRIMARY_SOURCE_REQUIRED');
  const primary = primaries[0];
  let serial = 0;
  const rows = sourceList.flatMap(source => (Array.isArray(source.rows) ? source.rows : []).map((row, index) => {
    const classification = classifyMovement(row.movement);
    const fp = rowFingerprint(row);
    return {
      sourceId: String(source.sourceId || 'UNKNOWN_SOURCE'),
      sourceRole: source.role === 'PRIMARY' ? 'PRIMARY' : 'SUPPORTING',
      rawRecordId: String(row.rawRecordId || `${source.sourceId || 'UNKNOWN_SOURCE'}:row:${index + 1}`),
      canonicalRecordId: null,
      rowFingerprint: fp,
      eventId: row.eventId ? String(row.eventId) : '',
      date: String(row.date || ''),
      kind: row.kind || classification.kind,
      incomeStatus: row.incomeStatus || classification.incomeStatus,
      reasonCode: classification.reasonCode,
      assetKey: String(row.assetKey || ''),
      quantity: String(row.quantity ?? ''),
      amountCents: Number.isSafeInteger(row.amountCents) ? row.amountCents : null,
      custodian: String(row.custodian || ''),
      includedInCanonical: false,
      duplicateState: 'UNIQUE',
      sourceMatchId: null,
      _serial: serial++,
    };
  }));
  const primaryRows = rows.filter(row => row.sourceId === String(primary.sourceId) && row.sourceRole === 'PRIMARY');
  const fingerprintGroups = new Map();
  for (const row of primaryRows) {
    if (!fingerprintGroups.has(row.rowFingerprint)) fingerprintGroups.set(row.rowFingerprint, []);
    fingerprintGroups.get(row.rowFingerprint).push(row);
    row.canonicalRecordId = `${row.sourceId}:${row.rawRecordId}`;
    row.includedInCanonical = true;
  }
  let exactDuplicates = 0;
  let unresolvedDuplicateRows = 0;
  let unresolvedDuplicateExcess = 0;
  for (const group of fingerprintGroups.values()) {
    if (group.length < 2) continue;
    const ids = new Set(group.map(row => row.eventId).filter(Boolean));
    if (ids.size === 1 && group.every(row => row.eventId)) {
      for (const row of group.slice(1)) {
        row.duplicateState = 'EXACT_DUPLICATE';
        row.reasonCode = 'SAME_STABLE_EVENT_ID';
        row.sourceMatchId = group[0].rawRecordId;
        row.canonicalRecordId = group[0].canonicalRecordId;
        row.includedInCanonical = false;
        exactDuplicates++;
      }
    } else {
      for (const row of group) {
        row.duplicateState = 'UNRESOLVED';
        row.reasonCode = 'IDENTICAL_PAYLOAD_WITHOUT_STABLE_EVENT_ID';
      }
      unresolvedDuplicateRows += group.length;
      unresolvedDuplicateExcess += group.length - 1;
    }
  }
  const eventIds = new Map();
  for (const row of primaryRows.filter(row => row.eventId)) {
    if (!eventIds.has(row.eventId)) eventIds.set(row.eventId, []);
    eventIds.get(row.eventId).push(row);
  }
  for (const group of eventIds.values()) {
    if (new Set(group.map(row => row.rowFingerprint)).size < 2) continue;
    for (const row of group) {
      row.duplicateState = 'CONFLICTING_DUPLICATE';
      row.reasonCode = 'SAME_STABLE_EVENT_ID_DIFFERENT_PAYLOAD';
      row.includedInCanonical = true;
    }
  }
  const available = new Map();
  for (const row of primaryRows) {
    if (!available.has(row.rowFingerprint)) available.set(row.rowFingerprint, []);
    available.get(row.rowFingerprint).push(row);
  }
  let supportingOverlaps = 0;
  let supportingAmbiguousMappings = 0;
  let supportingUnmatched = 0;
  const supportingDuplicateExcess = sourceList.filter(source => source?.role !== 'PRIMARY').reduce((sum, source) => { const fps = (Array.isArray(source.rows) ? source.rows : []).map(rowFingerprint); return sum + fps.length - new Set(fps).size; }, 0);
  for (const row of rows.filter(item => item.sourceRole === 'SUPPORTING')) {
    const matches = available.get(row.rowFingerprint) || [];
    if (matches.length) {
      row.duplicateState = 'OVERLAPPING_EXPORT';
      row.reasonCode = matches.length === 1 ? 'OVERLAPPING_EXPORT' : 'OVERLAPPING_EXPORT_MULTIPLE_PRIMARY_CANDIDATES';
      if (matches.length === 1) { row.sourceMatchId = matches[0].rawRecordId; row.canonicalRecordId = matches[0].canonicalRecordId; }
      else supportingAmbiguousMappings++;
      supportingOverlaps++;
    } else {
      row.duplicateState = 'UNRESOLVED';
      row.reasonCode = 'SUPPORTING_ROW_NOT_FOUND_IN_PRIMARY';
      supportingUnmatched++;
    }
  }
  const auditRecords = rows.map(({ _serial, ...row }) => row);
  const canonicalRecords = auditRecords.filter(row => row.sourceRole === 'PRIMARY' && row.includedInCanonical);
  const unresolved = unresolvedDuplicateRows + supportingAmbiguousMappings + supportingUnmatched + auditRecords.filter(row => row.duplicateState === 'CONFLICTING_DUPLICATE').length;
  return {
    mode: 'READ_ONLY_DRY_RUN', writeEnabled: false, mutationCount: 0,
    canonicalStatus: unresolved ? 'NOT_CERTIFIED' : 'REVIEWABLE',
    canonicalRecords, auditRecords,
    summary: { rawRecordCount: rows.length, primaryRecordCount: primaryRows.length, canonicalRecordCount: canonicalRecords.length, exactDuplicates, unresolvedDuplicateRows, unresolvedDuplicateExcess, supportingDuplicateExcess, supportingOverlaps, supportingAmbiguousMappings, supportingUnmatched, conflictingDuplicateRows: auditRecords.filter(row => row.duplicateState === 'CONFLICTING_DUPLICATE').length },
  };
}

function businessDaysBetween(left, right) {
  const a = Date.parse(`${left}T00:00:00Z`), b = Date.parse(`${right}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const direction = a <= b ? 1 : -1;
  let day = a, count = 0;
  while (day !== b) {
    day += direction * 86400000;
    const weekday = new Date(day).getUTCDay();
    if (weekday !== 0 && weekday !== 6) count++;
  }
  return count;
}

function pairTransfers(records = [], { maxBusinessDays = 2 } = {}) {
  const transferRows = (Array.isArray(records) ? records : []).filter(row => ['TRANSFER_IN', 'TRANSFER_OUT', 'TRANSFER_CANDIDATE'].includes(row.kind));
  const candidates = transferRows.filter(row => ['TRANSFER_IN', 'TRANSFER_OUT'].includes(row.kind));
  const edges = new Map(candidates.map(row => [row.rawRecordId, []]));
  for (let i = 0; i < candidates.length; i++) for (let j = i + 1; j < candidates.length; j++) {
    const a = candidates[i], b = candidates[j];
    if (a.kind === b.kind || !a.assetKey || a.assetKey !== b.assetKey || !a.quantity || a.quantity !== b.quantity) continue;
    const days = businessDaysBetween(a.date, b.date);
    if (days === null || days > maxBusinessDays) continue;
    const [out, incoming] = a.kind === 'TRANSFER_OUT' ? [a, b] : [b, a];
    const edge = { out, incoming, businessDays: days, amountMatches: Number.isSafeInteger(a.amountCents) && Number.isSafeInteger(b.amountCents) ? a.amountCents === b.amountCents : null };
    edges.get(a.rawRecordId).push(edge); edges.get(b.rawRecordId).push(edge);
  }
  const pairs = [], ambiguous = [], unpaired = transferRows.filter(row => row.kind === 'TRANSFER_CANDIDATE').map(row => row.rawRecordId);
  const handled = new Set();
  for (const row of candidates) {
    if (handled.has(row.rawRecordId)) continue;
    const options = edges.get(row.rawRecordId);
    if (!options.length) { unpaired.push(row.rawRecordId); handled.add(row.rawRecordId); continue; }
    const uniqueMutual = options.length === 1 && edges.get(options[0].out.rawRecordId).length === 1 && edges.get(options[0].incoming.rawRecordId).length === 1;
    if (!uniqueMutual) {
      const related = new Set(options.flatMap(edge => [edge.out.rawRecordId, edge.incoming.rawRecordId]));
      for (const id of related) { if (!handled.has(id)) ambiguous.push({ rawRecordId: id, reasonCode: 'MULTIPLE_TRANSFER_CANDIDATES' }); handled.add(id); }
      continue;
    }
    const edge = options[0], { out, incoming } = edge;
    const custodiansDistinct = Boolean(out.custodian && incoming.custodian && out.custodian !== incoming.custodian);
    if (!custodiansDistinct || edge.amountMatches !== true) {
      const reasonCode = !custodiansDistinct ? 'CUSTODIAN_IDENTITY_INSUFFICIENT' : edge.amountMatches === null ? 'TRANSFER_AMOUNT_MISSING' : 'TRANSFER_AMOUNT_CONFLICT';
      ambiguous.push({ rawRecordId: out.rawRecordId, reasonCode }, { rawRecordId: incoming.rawRecordId, reasonCode });
    } else {
      pairs.push({ status: edge.businessDays === 0 ? 'EXACT_PAIR' : 'PROBABLE_PAIR', outRecordId: out.rawRecordId, inRecordId: incoming.rawRecordId, businessDays: edge.businessDays, reasonCode: edge.businessDays === 0 ? 'SAME_ASSET_QUANTITY_AMOUNT_AND_DATE' : 'SAME_ASSET_QUANTITY_AMOUNT_WITHIN_BUSINESS_DAY_WINDOW' });
    }
    handled.add(out.rawRecordId); handled.add(incoming.rawRecordId);
  }
  return { pairs, ambiguous, unpaired: unpaired.sort(), writeEnabled: false };
}

function monthKey(value) { return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value).slice(0, 7) : ''; }
function monthRange(start, end) {
  const [sy, sm] = String(start).split('-').map(Number), [ey, em] = String(end).split('-').map(Number);
  if (!sy || !sm || !ey || !em || sy * 12 + sm > ey * 12 + em) throw new Error('INVALID_MONTH_RANGE');
  const result = [];
  for (let y = sy, m = sm; y < ey || (y === ey && m <= em);) { result.push(`${y}-${String(m).padStart(2, '0')}`); if (++m === 13) { y++; m = 1; } }
  return result;
}
function monthlyCoverage(records = [], { start, end, completeMonths = [] } = {}) {
  const counts = new Map();
  for (const row of Array.isArray(records) ? records : []) {
    const month = monthKey(row.date);
    if (!month) continue;
    const item = counts.get(month) || { recordCount: 0, receivedIncomeRecordCount: 0, receivedIncomeCents: 0, incomeAmountUnknown: false, duplicateRisk: false };
    item.recordCount++;
    if (row.incomeStatus === 'RECEIVED') {
      item.receivedIncomeRecordCount++;
      if (Number.isSafeInteger(row.amountCents) && Number.isSafeInteger(item.receivedIncomeCents + row.amountCents)) item.receivedIncomeCents += row.amountCents;
      else item.incomeAmountUnknown = true;
      if (row.duplicateState && row.duplicateState !== 'UNIQUE') item.duplicateRisk = true;
    }
    counts.set(month, item);
  }
  const complete = new Set(completeMonths);
  return monthRange(start, end).map(month => {
    const item = counts.get(month);
    const noActivityConfirmed = complete.has(month) && !item;
    const incomeKnown = item && !item.incomeAmountUnknown && !item.duplicateRisk;
    return {
      month,
      recordCount: item?.recordCount || 0,
      receivedIncomeRecordCount: item?.receivedIncomeRecordCount || 0,
      observedReceivedCents: noActivityConfirmed || complete.has(month) && incomeKnown && !item?.receivedIncomeRecordCount ? 0 : incomeKnown && item.receivedIncomeRecordCount ? item.receivedIncomeCents : null,
      status: complete.has(month) ? 'COMPLETE' : item ? 'PARTIAL' : 'UNKNOWN',
      noActivityConfirmed,
    };
  });
}

function summarizeIncome(records = [], { completeYears = [] } = {}) {
  const groups = new Map();
  for (const row of Array.isArray(records) ? records : []) {
    if (row.incomeStatus !== 'RECEIVED') continue;
    const year = String(row.date || '').slice(0, 4);
    if (!/^\d{4}$/.test(year)) continue;
    if (!groups.has(year)) groups.set(year, { year, receivedRecordCount: 0, _sum: 0, _unknownAmount: false, _duplicateRisk: false, _byKind: new Map() });
    const group = groups.get(year); group.receivedRecordCount++;
    const kind = String(row.kind || 'UNKNOWN');
    const byKind = group._byKind.get(kind) || { recordCount: 0, sum: 0, unknownAmount: false, duplicateRisk: false };
    byKind.recordCount++;
    if (Number.isSafeInteger(row.amountCents) && Number.isSafeInteger(byKind.sum + row.amountCents)) byKind.sum += row.amountCents; else byKind.unknownAmount = true;
    if (Number.isSafeInteger(row.amountCents) && Number.isSafeInteger(group._sum + row.amountCents)) group._sum += row.amountCents; else group._unknownAmount = true;
    if (row.duplicateState && row.duplicateState !== 'UNIQUE') { group._duplicateRisk = true; byKind.duplicateRisk = true; }
    group._byKind.set(kind, byKind);
  }
  return [...groups.values()].sort((a, b) => a.year.localeCompare(b.year)).map(group => {
    const complete = new Set(completeYears).has(group.year);
    const amountKnown = !group._unknownAmount && !group._duplicateRisk;
    return { year: group.year, receivedRecordCount: group.receivedRecordCount, observedReceivedCents: amountKnown ? group._sum : null, receivedByKind: Object.fromEntries([...group._byKind].map(([kind, item]) => [kind, { recordCount: item.recordCount, observedCents: !item.unknownAmount && !item.duplicateRisk ? item.sum : null }])), coverage: complete && amountKnown ? 'COMPLETE' : 'PARTIAL', completeYearTotalCents: complete && amountKnown ? group._sum : null, reasonCode: group._duplicateRisk ? 'DUPLICATE_RISK' : complete ? 'SOURCE_COVERAGE_ATTESTED' : 'SOURCE_COVERAGE_NOT_ATTESTED' };
  });
}

function buildYearPreview(records = [], { year, sourceCoverage = 'UNKNOWN' } = {}) {
  if (!/^\d{4}$/.test(String(year))) throw new Error('VALID_YEAR_REQUIRED');
  const rows = (Array.isArray(records) ? records : []).filter(row => String(row.date || '').startsWith(`${year}-`));
  const kinds = {};
  let receivedCents = 0, receivedAmountUnknown = false, duplicateRisk = false, recordDuplicateRisk = false;
  for (const row of rows) {
    const kind = String(row.kind || 'UNKNOWN');
    kinds[kind] = (kinds[kind] || 0) + 1;
    if (row.duplicateState && row.duplicateState !== 'UNIQUE') recordDuplicateRisk = true;
    if (row.incomeStatus !== 'RECEIVED') continue;
    if (Number.isSafeInteger(row.amountCents) && Number.isSafeInteger(receivedCents + row.amountCents)) receivedCents += row.amountCents;
    else receivedAmountUnknown = true;
    if (row.duplicateState && row.duplicateState !== 'UNIQUE') duplicateRisk = true;
  }
  const receivedKnown = !receivedAmountUnknown && !duplicateRisk;
  const unknownIncomeRecords = rows.filter(row => row.incomeStatus === 'UNKNOWN' || row.kind === 'INCOME_CANDIDATE').length;
  const noIncomeConfirmed = sourceCoverage === 'COMPLETE' && !recordDuplicateRisk && !unknownIncomeRecords && !rows.some(row => row.incomeStatus === 'RECEIVED');
  return {
    year: String(year), recordCount: rows.length,
    sourceCoverage: ['COMPLETE', 'PARTIAL', 'UNKNOWN'].includes(sourceCoverage) ? sourceCoverage : 'UNKNOWN',
    receivedRecordCount: rows.filter(row => row.incomeStatus === 'RECEIVED').length,
    unknownRecordCount: rows.filter(row => row.kind === 'UNKNOWN' || row.incomeStatus === 'UNKNOWN').length,
    transferRecordCount: rows.filter(row => String(row.kind || '').startsWith('TRANSFER') || row.kind === 'SETTLEMENT_CANDIDATE').length,
    assetKeys: [...new Set(rows.map(row => row.assetKey).filter(Boolean))].sort(),
    custodians: [...new Set(rows.map(row => row.custodian).filter(Boolean))].sort(),
    kinds,
    status: sourceCoverage === 'COMPLETE' && !recordDuplicateRisk && !unknownIncomeRecords && !receivedAmountUnknown ? 'COMPLETE' : rows.length ? 'PARTIAL' : 'UNKNOWN',
    incomeCoverage: sourceCoverage === 'COMPLETE' && !recordDuplicateRisk && !unknownIncomeRecords && !receivedAmountUnknown ? 'COMPLETE' : rows.length ? 'PARTIAL' : 'UNKNOWN',
    unknownIncomeRecordCount: unknownIncomeRecords,
    reasonCodes: [...(recordDuplicateRisk ? ['DUPLICATE_RISK'] : []), ...(sourceCoverage !== 'COMPLETE' ? ['SOURCE_COVERAGE_NOT_ATTESTED'] : []), ...(unknownIncomeRecords ? ['UNKNOWN_INCOME_CLASSIFICATION'] : []), ...(receivedAmountUnknown ? ['RECEIVED_AMOUNT_UNKNOWN'] : [])],
    observedReceivedCents: receivedKnown && rows.some(row => row.incomeStatus === 'RECEIVED') ? receivedCents : noIncomeConfirmed ? 0 : null,
  };
}

function deriveHistoricalPosition({ snapshot, events = [], targetAsOf, completeMonths = [] } = {}) {
  if (!snapshot || !/^\d{4}-\d{2}-\d{2}$/.test(String(snapshot.asOf || '')) || !/^\d{4}-\d{2}-\d{2}$/.test(String(targetAsOf || '')) || !Number.isSafeInteger(snapshot.quantityMicros)) return { status: 'UNKNOWN', quantityMicros: null, reasonCode: 'VALID_SNAPSHOT_AND_TARGET_REQUIRED' };
  if (snapshot.coverage !== 'COMPLETE' || targetAsOf > snapshot.asOf) return { status: 'UNKNOWN', quantityMicros: null, reasonCode: snapshot.coverage !== 'COMPLETE' ? 'SNAPSHOT_COVERAGE_NOT_COMPLETE' : 'TARGET_AFTER_SNAPSHOT' };
  if (targetAsOf === snapshot.asOf) return { status: 'OBSERVED', quantityMicros: snapshot.quantityMicros, sourceIds: [String(snapshot.sourceId || 'UNKNOWN_SOURCE')], eventIds: [] };
  const requiredMonths = monthRange(monthKey(targetAsOf), monthKey(snapshot.asOf));
  const attested = new Set(completeMonths);
  if (requiredMonths.some(month => !attested.has(month))) return { status: 'UNKNOWN', quantityMicros: null, reasonCode: 'INTERVAL_COVERAGE_NOT_COMPLETE' };
  const relevant = (Array.isArray(events) ? events : []).filter(event => event.date > targetAsOf && event.date <= snapshot.asOf);
  const nonPositionKinds = new Set(['DIVIDEND', 'JCP', 'FII_INCOME', 'INTEREST', 'AMORTIZATION', 'FEE', 'TAX']);
  let delta = 0;
  for (const event of relevant) {
    if (nonPositionKinds.has(event.kind)) continue;
    if (!['BUY', 'SELL', 'TRANSFER_IN', 'TRANSFER_OUT', 'CORPORATE_EVENT_CONFIRMED'].includes(event.kind) || !Number.isSafeInteger(event.quantityDeltaMicros)) return { status: 'UNKNOWN', quantityMicros: null, reasonCode: 'UNRESOLVED_POSITION_EVENT', blockingEventId: String(event.rawRecordId || '') };
    delta += event.kind === 'SELL' || event.kind === 'TRANSFER_OUT' ? -event.quantityDeltaMicros : event.quantityDeltaMicros;
    if (!Number.isSafeInteger(delta)) return { status: 'UNKNOWN', quantityMicros: null, reasonCode: 'QUANTITY_OVERFLOW' };
  }
  const quantityMicros = snapshot.quantityMicros - delta;
  if (!Number.isSafeInteger(quantityMicros) || quantityMicros < 0) return { status: 'UNKNOWN', quantityMicros: null, reasonCode: 'DERIVED_QUANTITY_INVALID' };
  return { status: 'DERIVED', quantityMicros, sourceIds: [String(snapshot.sourceId || 'UNKNOWN_SOURCE')], eventIds: relevant.map(event => String(event.rawRecordId || '')).filter(Boolean), derivationStart: targetAsOf, derivationEnd: snapshot.asOf, assumptions: ['COMPLETE_SOURCE_COVERAGE_FOR_EACH_INTERVAL_MONTH', 'EVENT_QUANTITY_IN_MICRO_UNITS'] };
}

function buildSourcePreview(auditRecords = []) {
  const groups = new Map();
  for (const row of Array.isArray(auditRecords) ? auditRecords : []) {
    const id = String(row.sourceId || 'UNKNOWN_SOURCE');
    const item = groups.get(id) || { sourceId: id, recordCount: 0, canonicalRecordCount: 0, kinds: {}, duplicateStates: {} };
    item.recordCount++;
    if (row.includedInCanonical) item.canonicalRecordCount++;
    const kind = String(row.kind || 'UNKNOWN'), duplicateState = String(row.duplicateState || 'UNRESOLVED');
    item.kinds[kind] = (item.kinds[kind] || 0) + 1;
    item.duplicateStates[duplicateState] = (item.duplicateStates[duplicateState] || 0) + 1;
    groups.set(id, item);
  }
  return [...groups.values()].sort((a, b) => a.sourceId.localeCompare(b.sourceId));
}

function buildReadonlyImportPreview(canonicalization) {
  if (!canonicalization?.summary || !Array.isArray(canonicalization.auditRecords) || !Array.isArray(canonicalization.canonicalRecords)) throw new Error('CANONICALIZATION_RESULT_REQUIRED');
  const { summary } = canonicalization;
  const records = canonicalization.canonicalRecords;
  return {
    mode: 'READ_ONLY_DRY_RUN',
    writeEnabled: false,
    mutationCount: 0,
    status: canonicalization.canonicalStatus,
    recordsDetected: summary.primaryRecordCount,
    canonicalRecords: summary.canonicalRecordCount,
    recordsNew: null,
    recordsNewReasonCode: 'CURRENT_APPLICATION_STATE_NOT_COMPARED',
    exactDuplicates: summary.exactDuplicates,
    duplicateCandidates: summary.unresolvedDuplicateExcess + summary.supportingDuplicateExcess,
    conflictingRecords: summary.conflictingDuplicateRows,
    overlappingSupportingRecords: summary.supportingOverlaps,
    ambiguousSupportingMappings: summary.supportingAmbiguousMappings,
    unmatchedSupportingRecords: summary.supportingUnmatched,
    unknownRecords: records.filter(row => row.kind === 'UNKNOWN' || row.incomeStatus === 'UNKNOWN').length,
    expectedRecords: records.filter(row => row.incomeStatus === 'EXPECTED').length,
    receivedRecords: records.filter(row => row.incomeStatus === 'RECEIVED').length,
    financialDeltaCents: null,
    coverageChange: 'UNKNOWN',
  };
}

module.exports = { classifyMovement, rowFingerprint, canonicalizeSources, pairTransfers, monthlyCoverage, summarizeIncome, buildYearPreview, deriveHistoricalPosition, buildSourcePreview, buildReadonlyImportPreview };
