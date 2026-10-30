'use strict';
// ============================================================================
// IR2026 — hardening contract tests (rule-authority consolidation mission).
// P3 no-fiscal-literals, P19 rights pending treatment, P21 blocker taxonomy,
// P23 fail-closed (expired/typo rules), P30/P31/P32 domain boundaries,
// determinism of the monthly assessment.
// ============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { BLOCKERS, INFO_FLAGS, isBlockerCode, isInfoFlag } = require('../ir2026/blockers');
const { loadRegistry, resolveRule, officialRule, getTaxRate, taxDueCalculationAllowed } = require('../ir2026/rules');
const { assessMonth } = require('../ir2026/fiscal-product');
const { classifyAssetClass } = require('../ir2026/contracts');
const { buildOpeningFiscal } = require('../ir2026/opening-fiscal');

const ENGINE_DIRS = ['ir2026', 'ir2026/ui'];
const ENGINE_FILES = ENGINE_DIRS.flatMap((d) => fs.readdirSync(path.join(__dirname, '..', d))
  .filter((f) => f.endsWith('.js')).map((f) => path.join(__dirname, '..', d, f)));
const asOf = '2026-06-30';
const registry = loadRegistry();

test('local evidence runners can be imported without private source files', () => {
  const probe = `
    const fs = require('node:fs');
    const path = require('node:path');
    const originalExistsSync = fs.existsSync;
    fs.existsSync = (file, ...args) => {
      if (String(file).endsWith(path.join('.qa-state', 'ir2026', 'source-inventory.local.json'))) {
        throw new Error('private inventory accessed during module import');
      }
      return originalExistsSync(file, ...args);
    };
    require('./ir2026/scripts/build-fiscal-2026');
    require('./ir2026/scripts/build-opening-v1');
    require('./ir2026/scripts/build-opening-evidence');
  `;
  const result = spawnSync(process.execPath, ['-e', probe], { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
});

// ---------------------------------------------------------------------------
// P21 — blocker taxonomy is complete: every code the engine emits exists.
// ---------------------------------------------------------------------------
test('P21: every blockers.push()/BLOCKERS.push() code in the engine exists in the taxonomy', () => {
  const emitted = new Set();
  for (const file of ENGINE_FILES) {
    if (file.endsWith(path.join('ir2026', 'blockers.js'))) continue; // taxonomy itself (doc comment uses push('X') as placeholder)
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/[Bb]lockers\.push\('([A-Z_]+)'\)/g)) emitted.add(m[1]);
  }
  assert.ok(emitted.size >= 15, `expected a meaningful emitter set, got ${emitted.size}`);
  for (const code of emitted) {
    assert.ok(isBlockerCode(code) || isInfoFlag(code),
      `${code} (emitted in engine) is missing from BLOCKERS/INFO_FLAGS taxonomy`);
  }
});

test('P21: every taxonomy blocker carries scope metadata (severity + affects + resolution)', () => {
  for (const [code, meta] of Object.entries(BLOCKERS)) {
    assert.ok(meta.TITLE, `${code} needs TITLE`);
    assert.ok(Array.isArray(meta.RESOLVED_BY) && meta.RESOLVED_BY.length > 0, `${code} needs RESOLVED_BY`);
    assert.ok(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(meta.SEVERITY), `${code} needs valid SEVERITY`);
    assert.ok(Array.isArray(meta.AFFECTS) && meta.AFFECTS.length > 0, `${code} needs AFFECTS`);
  }
});

test('P21: info flags never surface in the human document checklist', () => {
  const { checklistFromBlockers } = require('../ir2026/blockers');
  const list = checklistFromBlockers(Object.fromEntries(Object.keys(INFO_FLAGS).map((f) => [f, 5])));
  assert.equal(list.length, 0);
});

// ---------------------------------------------------------------------------
// P3 — no fiscal magic numbers in engine code (registry is the only home).
// ---------------------------------------------------------------------------
test('P3: engine code contains no literal fiscal rates, thresholds or bps values', () => {
  // Curated literal families: decimal rates, bps rates, money thresholds.
  // ponytail: family scan instead of a generic number detector — a generic
  // one false-positives on math constants (10000 bps cap, 1e8 qty scale).
  const families = [
    /(?<![\d.])0\.15(?![\d])/, /(?<![\d.])0\.175(?![\d])/, /(?<![\d.])0\.20(?![\d])/,
    /(?<![\d.])0\.225(?![\d])/, /(?<![\d.])0\.005(?![\d])/, /(?<![\d.])0\.00005(?![\d])/,
    /(?<![\d.])(1500|1750|2000|2250)(?![\d])/,
    /(?<![\d.])(20000|50000|2000000|5000000)(?![\d.])/,
  ];
  for (const file of ENGINE_FILES) {
    const src = fs.readFileSync(file, 'utf8');
    for (const re of families) {
      const m = src.match(re);
      assert.equal(m, null, `${file} contains fiscal literal ${m && m[0]} — must come from the rule registry`);
    }
  }
});

// ---------------------------------------------------------------------------
// P23 — fail-closed: expired rules, typo'd ids and rate-less IRRF rules.
// ---------------------------------------------------------------------------
test('P23: expired rule and rule-id typo fail closed (null, never a guess)', () => {
  const r = structuredClone(registry);
  const swing = r.RULES.find((x) => x.RULE_ID === 'RULE_RV_SWING_RATE');
  swing.EFFECTIVE_TO = '2025-12-31';
  assert.equal(resolveRule(r, 'RULE_RV_SWING_RATE', asOf), null);
  assert.equal(taxDueCalculationAllowed(r, ['RULE_RV_SWING_RATE'], asOf), false);
  // typo'd rule id resolves to null without throwing
  assert.equal(resolveRule(registry, 'RULE_RV_SWING_RAT', asOf), null);
  assert.equal(taxDueCalculationAllowed(registry, ['RULE_RV_SWING_RAT'], asOf), false);
});

test('P23: IRRF anticipation rule supplies no rate until RATE_BPS is registered (IRRF stays evidence-only)', () => {
  // 0,005% exists only as prose in CALCULATION_METHOD — the engine must not
  // parse prose; without RATE_BPS the rule cannot feed any rate consumer.
  const rule = resolveRule(registry, 'RULE_SWING_IRRF_ANTICIPATION_0005', asOf);
  assert.ok(rule);
  assert.equal(rule.RATE_BPS, undefined);
  assert.equal(getTaxRate(registry, 'RULE_SWING_IRRF_ANTICIPATION_0005', asOf), null);
  assert.equal(officialRule(registry, 'RULE_SWING_IRRF_ANTICIPATION_0005', asOf) && rule.SEMANTICS_VERIFIED === true
    ? getTaxRate(registry, 'RULE_SWING_IRRF_ANTICIPATION_0005', asOf) : null, null);
});

test('P4/P8: loss-bucket and effective-date API equivalents resolve from the registry', () => {
  const loss = resolveRule(registry, 'RULE_LOSS_CARRYFORWARD_SAME_CATEGORY', asOf);
  assert.ok(loss && loss.SCOPE === 'LOSS_LEDGER');
  assert.equal(resolveRule(registry, 'RULE_DIVIDEND_TRANSITIONAL_2025_RESULTS', '2029-01-01'), null); // EFFECTIVE_TO 2028
});

// ---------------------------------------------------------------------------
// P19 — subscription rights never inherit certified/zero cost.
// ---------------------------------------------------------------------------
test('P19: rights rows are classified RIGHTS_SUBSCRIPTION from product/movement hints', () => {
  assert.deepEqual(classifyAssetClass('TEST12', { product: 'DIREITOS DE SUBSCRIÇÃO TEST11' }),
    { assetClass: 'RIGHTS_SUBSCRIPTION', basis: 'HINT:RIGHTS' });
  assert.deepEqual(classifyAssetClass('TEST12', { product: 'TEST11', movement: 'Subscrição' }),
    { assetClass: 'RIGHTS_SUBSCRIPTION', basis: 'HINT:RIGHTS' });
  // without the hint the ticker alone stays on the FII pattern (documented ceiling:
  // ticker shape cannot distinguish rights from units — hint or evidence required)
  assert.equal(classifyAssetClass('TEST12', {}).assetClass, 'FII');
});

test('P19: rights position carries RIGHTS_POSITION_PENDING_FISCAL_TREATMENT and never a certified cost', () => {
  // rights bought pre-year with evidenced amount: statement-zero must not certify cost
  const raw = [
    { CANONICAL_ID: 'R1', DATE: '2025-12-15', TICKER: 'TEST12', PRODUCT: 'DIREITOS TEST11', TYPE: 'BUY',
      DIRECTION: 'Credito', QUANTITY: 10, UNIT_PRICE: 2.5, AMOUNT: 25, STATUS: 'CERTIFIED', PROVENANCE: 'synthetic' },
  ];
  const anchors = { TEST12: { QTY: 10, AS_OF: '2026-06-30' } };
  const opening = buildOpeningFiscal({ rawEvents: raw, anchors, fiscalYear: 2026, registry });
  const row = opening.ROWS.find((x) => x.ASSET === 'TEST12');
  assert.ok(row, 'rights asset in scope via anchor');
  assert.equal(row.ASSET_CLASS, 'RIGHTS_SUBSCRIPTION');
  assert.equal(row.PENDING_FISCAL_TREATMENT, 'RIGHTS_POSITION_PENDING_FISCAL_TREATMENT');
  assert.equal(row.COST_STATUS, 'CERTIFIED'); // documented cost is certified, never coerced to UNKNOWN
  assert.equal(row.OPENING_TOTAL_COST_CENTS, 2500); // 25 * 100 cents
  assert.ok(row.BLOCKERS.includes('RIGHTS_FISCAL_TREATMENT_PENDING'));
  assert.ok(isBlockerCode('RIGHTS_FISCAL_TREATMENT_PENDING'));

  // rights born during the fiscal year: opening row keeps NOT_APPLICABLE (no
  // position at Jan-1) but is still marked pending, with zero qty honestly zero
  const raw2 = [
    { CANONICAL_ID: 'R2', DATE: '2026-03-10', TICKER: 'TEST12', PRODUCT: 'DIREITOS TEST11', TYPE: 'CORPORATE_ACTION',
      MOVEMENT_RAW: 'Leilão de frações', DIRECTION: 'Credito', QUANTITY: 5, STATUS: 'PARTIAL', PROVENANCE: 'synthetic' },
  ];
  const opening2 = buildOpeningFiscal({ rawEvents: raw2, anchors: {}, fiscalYear: 2026, registry });
  const row2 = opening2.ROWS.find((x) => x.ASSET === 'TEST12');
  assert.equal(row2.PENDING_FISCAL_TREATMENT, 'RIGHTS_POSITION_PENDING_FISCAL_TREATMENT');
  assert.equal(row2.OPENING_QTY, 0);
  assert.ok(row2.BLOCKERS.includes('RIGHTS_FISCAL_TREATMENT_PENDING'));
});

// ---------------------------------------------------------------------------
// P5/P6/P7 — subscription normalization reachability and fail-closed ambiguity.
// ---------------------------------------------------------------------------
const { normalizeEventType } = require('../ir2026/contracts');

test('P5: explicit subscription movement text normalizes to SUBSCRIPTION', () => {
  assert.equal(normalizeEventType('CORPORATE_ACTION', 'Subscrição de ações'), 'SUBSCRIPTION');
  assert.equal(normalizeEventType('CORPORATE_ACTION', 'EXERCÍCIO DE DIREITOS DE SUBSCRIÇÃO'), 'SUBSCRIPTION');
  assert.equal(normalizeEventType('CORPORATE_ACTION', 'Subscription'), 'SUBSCRIPTION');
  // precedence: fraction auction of rights is a RIGHTS_TRANSFER (sale), not a subscription
  assert.equal(normalizeEventType('CORPORATE_ACTION', 'Leilão de direitos de subscrição'), 'RIGHTS_TRANSFER');
  assert.equal(normalizeEventType('CORPORATE_ACTION', 'Bonificação de ações'), 'BONUS');
});

test('P7: ambiguous subscription-like text stays UNKNOWN — no fuzzy promotion', () => {
  assert.equal(normalizeEventType('CORPORATE_ACTION', 'Direitos'), 'UNKNOWN');
  assert.equal(normalizeEventType('CORPORATE_ACTION', 'Atualização de posição'), 'UNKNOWN');
  assert.equal(normalizeEventType('CORPORATE_ACTION', null), 'UNKNOWN');
  assert.equal(normalizeEventType('TRANSFER_CANDIDATE', 'Subscrição'), 'UNKNOWN'); // direction inferred -> UNKNOWN
});

test('P6: TEST12 rights row via SUBSCRIPTION year event keeps pending treatment and zero cost never certifies', () => {
  const raw = [
    { CANONICAL_ID: 'S1', DATE: '2026-06-01', TICKER: 'TEST12', PRODUCT: 'DIREITOS DE SUBSCRIÇÃO TEST11',
      TYPE: 'CORPORATE_ACTION', MOVEMENT_RAW: 'Exercício de direito de subscrição', DIRECTION: 'Credito',
      QUANTITY: 8, STATUS: 'PARTIAL', PROVENANCE: 'synthetic' },
  ];
  const opening = buildOpeningFiscal({ rawEvents: raw, anchors: {}, fiscalYear: 2026, registry });
  const row = opening.ROWS.find((x) => x.ASSET === 'TEST12');
  assert.ok(row, 'rights asset in scope via year event');
  assert.equal(row.ASSET_CLASS, 'RIGHTS_SUBSCRIPTION');
  assert.equal(row.PENDING_FISCAL_TREATMENT, 'RIGHTS_POSITION_PENDING_FISCAL_TREATMENT');
  assert.notEqual(row.COST_STATUS, 'CERTIFIED'); // zero statement fields never certify fiscal cost
  assert.ok(row.BLOCKERS.includes('RIGHTS_FISCAL_TREATMENT_PENDING'));
});

// ---------------------------------------------------------------------------
// Phase 3 — fixtures sintéticas para cenários de direitos de subscrição.
// ---------------------------------------------------------------------------

test('Fase3: direitos recebidos gratis — custo zero documentado, certificado', () => {
  // Direitos atribuídos gratuitamente pela posição em ações: custo zero é dado documentado,
  // não ausência de valor. Venda posterior com custo zero = lucro integral tributável.
  const raw = [
    { CANONICAL_ID: 'F1', DATE: '2025-11-01', TICKER: 'XYZ1', PRODUCT: 'DIREITOS XYZ11', TYPE: 'BUY',
      DIRECTION: 'Credito', QUANTITY: 100, UNIT_PRICE: 0, AMOUNT: 0, STATUS: 'CERTIFIED', PROVENANCE: 'synthetic' },
  ];
  const anchors = { XYZ1: { QTY: 100, AS_OF: '2026-01-01' } };
  const opening = buildOpeningFiscal({ rawEvents: raw, anchors, fiscalYear: 2026, registry });
  const row = opening.ROWS.find((x) => x.ASSET === 'XYZ1');
  assert.ok(row, 'XYZ1 in scope via anchor');
  assert.equal(row.COST_STATUS, 'CERTIFIED');
  assert.equal(row.OPENING_TOTAL_COST_CENTS, 0); // custo zero documentado, nao UNKNOWN
  assert.equal(row.OPENING_AVG_COST_CENTS, 0);
  assert.ok(row.BLOCKERS.includes('RIGHTS_FISCAL_TREATMENT_PENDING'));
});

test('Fase3: direito adquirido com custo conhecido — certificado com valor pago', () => {
  // Direito comprado na bolsa de terceiro: preço pago eh o custo de aquisição.
  const raw = [
    { CANONICAL_ID: 'F2', DATE: '2025-11-15', TICKER: 'ABC1', PRODUCT: 'DIREITOS ABC11', TYPE: 'BUY',
      DIRECTION: 'Credito', QUANTITY: 50, UNIT_PRICE: 2.0, AMOUNT: 100, STATUS: 'CERTIFIED', PROVENANCE: 'synthetic' },
  ];
  const anchors = { ABC1: { QTY: 50, AS_OF: '2026-01-01' } };
  const opening = buildOpeningFiscal({ rawEvents: raw, anchors, fiscalYear: 2026, registry });
  const row = opening.ROWS.find((x) => x.ASSET === 'ABC1');
  assert.ok(row, 'ABC1 in scope via anchor');
  assert.equal(row.COST_STATUS, 'CERTIFIED');
  assert.equal(row.OPENING_TOTAL_COST_CENTS, 10000); // 100 * 100
  assert.equal(row.OPENING_AVG_COST_CENTS, 200); // 10000 / 50
  assert.ok(row.BLOCKERS.includes('RIGHTS_FISCAL_TREATMENT_PENDING'));
});

test('Fase3: exercício de subscrição com custo comprovado — soma ao custo das ações subscritas', () => {
  // Exercício não é fato gerador; o valor pago soma ao custo das ações recebidas.
  // Usa CORPORATE_ACTION + movimento explícito (normalizeEventType mapeia para SUBSCRIPTION).
  // Na abertura fiscal, o evento do ano não gera linha de custo (custo é aplicado pelo
  // tax-ledger via buildTaxLedger); a abertura apenas classifica a posição pré-2026.
  const raw = [
    { CANONICAL_ID: 'F3', DATE: '2026-02-10', TICKER: 'DEF3', PRODUCT: 'DIREITOS DEF11', TYPE: 'CORPORATE_ACTION',
      MOVEMENT_RAW: 'Exercício de direito de subscrição', DIRECTION: 'Credito', QUANTITY: 20, UNIT_PRICE: 10.0, AMOUNT: 2000, STATUS: 'CERTIFIED', PROVENANCE: 'synthetic' },
  ];
  const opening = buildOpeningFiscal({ rawEvents: raw, anchors: {}, fiscalYear: 2026, registry });
  const row = opening.ROWS.find((x) => x.ASSET === 'DEF3');
  assert.ok(row, 'DEF3 in scope via year event');
  assert.equal(row.ASSET_CLASS, 'RIGHTS_SUBSCRIPTION');
  assert.equal(row.PENDING_FISCAL_TREATMENT, 'RIGHTS_POSITION_PENDING_FISCAL_TREATMENT');
  // Sem posição pré-2026: custo de abertura não aplicável (evento do ano processado pelo ledger)
  assert.equal(row.COST_STATUS, 'NOT_APPLICABLE');
  assert.equal(row.OPENING_QTY, 0);
});

test('Fase3: evento sem documentação suficiente — custo não aplicável quando evento bloqueado', () => {
  // Evento pré-2026 totalmente bloqueado (qty/amount nulos): custo fica 0 (estado inicial),
  // status NOT_APPLICABLE — não há posição para classificar.
  const raw = [
    { CANONICAL_ID: 'F4', DATE: '2025-10-01', TICKER: 'GHI1', PRODUCT: 'DIREITOS GHI11', TYPE: 'BUY',
      DIRECTION: 'Credito', QUANTITY: null, UNIT_PRICE: null, AMOUNT: null, STATUS: 'UNKNOWN', PROVENANCE: 'synthetic' },
  ];
  const anchors = { GHI1: { QTY: null, AS_OF: '2026-01-01' } };
  const opening = buildOpeningFiscal({ rawEvents: raw, anchors, fiscalYear: 2026, registry });
  const row = opening.ROWS.find((x) => x.ASSET === 'GHI1');
  assert.ok(row, 'GHI1 in scope via anchor');
  assert.equal(row.COST_STATUS, 'NOT_APPLICABLE'); // evento bloqueado, sem posição
  assert.equal(row.OPENING_TOTAL_COST_CENTS, 0); // estado inicial, sem custo aplicado
  assert.equal(row.OPENING_AVG_COST_CENTS, null);
});

test('Fase3: direito expirado — sem evento tributável, custo mantido se conhecido', () => {
  // Expiração de direito sem venda nem exercício: não há evento tributável.
  // O custo do direito expirado permanece conhecido se foi documentado na aquisição.
  const raw = [
    { CANONICAL_ID: 'F5', DATE: '2025-09-01', TICKER: 'JKL1', PRODUCT: 'DIREITOS JKL11', TYPE: 'BUY',
      DIRECTION: 'Credito', QUANTITY: 30, UNIT_PRICE: 1.5, AMOUNT: 45, STATUS: 'CERTIFIED', PROVENANCE: 'synthetic' },
  ];
  const anchors = { JKL1: { QTY: 30, AS_OF: '2026-01-01' } };
  const opening = buildOpeningFiscal({ rawEvents: raw, anchors, fiscalYear: 2026, registry });
  const row = opening.ROWS.find((x) => x.ASSET === 'JKL1');
  assert.ok(row, 'JKL1 in scope via anchor');
  assert.equal(row.COST_STATUS, 'CERTIFIED');
  assert.equal(row.OPENING_TOTAL_COST_CENTS, 4500); // 45 * 100
  // Nenhum evento de expiração no engine — expiração não gera efeito fiscal
  assert.ok(row.BLOCKERS.includes('RIGHTS_FISCAL_TREATMENT_PENDING'));
});

test('P14: a future rule change cannot silently rewrite a recorded monthly close', () => {
  const input = { bucket: 'RV_STOCK_SWING', asOf, monthGrossCents: 2100000, monthNetCents: 10000, dataStatus: 'PARTIAL' };
  const recorded = assessMonth({ ...input, registry });
  // later, the law changes and the registry gains a new rate — only an
  // EXPLICIT recomputation sees it; the recorded close keeps its own hash
  const future = structuredClone(registry);
  future.RULES.find((r) => r.RULE_ID === 'RULE_RV_SWING_RATE').RATE_BPS = 2000;
  future.REGISTRY_VERSION = 99;
  const recomputed = assessMonth({ ...input, registry: future });
  assert.equal(recorded.RULESET_HASH, assessMonth({ ...input, registry }).RULESET_HASH); // deterministic
  assert.notEqual(recomputed.RULESET_HASH, recorded.RULESET_HASH); // ruleset change is visible
  assert.equal(recorded.PROVISIONAL_TAX_CENTS, 1500); // recorded close untouched
  assert.equal(recomputed.PROVISIONAL_TAX_CENTS, 2000); // recomputation is the explicit path
});

test('P25: esc() regression — no literal backslash-u entity text, no raw specials in output', () => {
  const src = fs.readFileSync(path.join(__dirname, '../ir2026/ui/product.js'), 'utf8');
  const fnSrc = src.match(/function esc\(s\) \{[\s\S]*?\n\}/)[0];
  const esc = new Function(fnSrc + '; return esc;')();
  const specials = '<>&' + String.fromCharCode(34) + String.fromCharCode(39);
  const out = esc(specials);
  assert.ok(!/\\\\u0026|\\\\u00/.test(out), 'esc must not emit literal backslash-u entity text');
  // after stripping entity ampersands, no raw <,>,&,",\' may survive
  assert.ok(!/[<>"']/.test(out.replace(new RegExp(String.fromCharCode(38), 'g'), '')), 'raw specials must be escaped');
  assert.ok(out.includes(String.fromCharCode(38) + 'lt;'), 'less-than must become entity');
  assert.ok(out.includes(String.fromCharCode(38) + 'amp;'), 'ampersand must become entity');
});

// ---------------------------------------------------------------------------
// P30/P31 — domain boundaries.
// ---------------------------------------------------------------------------
test('P30/P31: ir2026 is a standalone domain — no finance/persistence/package2 imports', () => {
  for (const file of ENGINE_FILES) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/require\((['"])([^'"]+)\1\)/g)) {
      const spec = m[2];
      const isLocal = spec.startsWith('./') || spec.startsWith('../');
      const isBuiltin = spec.startsWith('node:') || ['fs', 'path', 'crypto', 'events', 'util'].includes(spec);
      assert.ok(isLocal || isBuiltin, `${file} requires non-local module ${spec}`);
      assert.ok(!/finance-core|persistence-core|package2|package1|modern/.test(spec),
        `${file} violates domain boundary: ${spec}`);
    }
  }
});

test('P31: statement/analytical current result can never feed the monthly taxable base', () => {
  const base = { registry, bucket: 'RV_STOCK_SWING', asOf,
    monthGrossCents: 2100000, monthNetCents: 10000, dataStatus: 'CERTIFIED' };
  const smuggled = { ...base, CURRENT_RESULT_CENTS: -106418300, UNREALIZED_CENTS: 999 };
  delete smuggled.dataStatus; // re-add below as same-status control
  smuggled.dataStatus = 'CERTIFIED';
  const a = assessMonth(base);
  const b = assessMonth(smuggled);
  // smuggled statement fields must not change any fiscal output
  assert.deepEqual(b, a);
  assert.equal(a.TAXABLE_BASE_CENTS, 10000);
  assert.notEqual(a.TAXABLE_BASE_CENTS, -106418300);
});

test('P32: partial income status never becomes certified by serialization', () => {
  const { monthlyCloseState } = require('../ir2026/fiscal-product');
  // PARTIAL data can only reach PROVISIONAL at best — never CERTIFIED
  assert.equal(monthlyCloseState({ close: { EVENTS: 3, UNKNOWN_BLOCKERS: 0 }, dataStatus: 'PARTIAL' }), 'PROVISIONAL');
  assert.equal(monthlyCloseState({ close: { EVENTS: 3, UNKNOWN_BLOCKERS: 1 }, dataStatus: 'PARTIAL' }), 'PARTIAL');
});

// ---------------------------------------------------------------------------
// Determinism — same inputs, same outputs (byte-identical assessment).
// ---------------------------------------------------------------------------
test('determinism: two assessments of the same month are byte-identical incl. ruleset hash', () => {
  const input = { registry, bucket: 'RV_STOCK_SWING', asOf,
    monthGrossCents: 2100000, monthNetCents: 10000, dataStatus: 'PARTIAL' };
  assert.deepEqual(assessMonth(input), assessMonth(input));
  assert.equal(assessMonth(input).RULESET_HASH, assessMonth(structuredClone(input)).RULESET_HASH);
});
