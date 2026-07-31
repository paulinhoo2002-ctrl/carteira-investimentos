const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const test = require('node:test');

const providerModulePath = path.join(
  __dirname,
  '..',
  'modern',
  'src',
  'domain',
  'fixedIncome',
  'cdiDailyFactorProvider.ts',
);

async function loadProvider() {
  return import(pathToFileURL(providerModulePath).href);
}

function createFactors(overrides = {}) {
  return [
    { date: '2026-01-10', factor: 1.0001, ...overrides },
    { date: '2026-01-11', factor: 1.0002, ...overrides },
    { date: '2026-01-12', factor: 1.0003, ...overrides },
    { date: '2026-01-13', factor: 1.0004, ...overrides },
    { date: '2026-01-14', factor: 1.0005, ...overrides },
    { date: '2026-01-15', factor: 1.0006, ...overrides },
  ];
}

test('cdiDailyFactorProvider: factory retorna provider congelado com getFactors', async () => {
  const { createStaticCdiDailyFactorProvider } = await loadProvider();
  const provider = createStaticCdiDailyFactorProvider(createFactors());

  assert.equal(typeof provider.getFactors, 'function');
  assert.equal(Object.isFrozen(provider), true);
});

test('cdiDailyFactorProvider: intervalo exclui fromDate e inclui toDate', async () => {
  const { createStaticCdiDailyFactorProvider } = await loadProvider();
  const provider = createStaticCdiDailyFactorProvider(createFactors());

  const result = provider.getFactors({ fromDate: '2026-01-12', toDate: '2026-01-14' });

  assert.equal(result.ok, true);
  assert.equal(result.factors.length, 2);
  assert.equal(result.factors[0].date, '2026-01-13');
  assert.equal(result.factors[1].date, '2026-01-14');
});

test('cdiDailyFactorProvider: fator exatamente em fromDate excluido', async () => {
  const { createStaticCdiDailyFactorProvider } = await loadProvider();
  const provider = createStaticCdiDailyFactorProvider(createFactors());

  const result = provider.getFactors({ fromDate: '2026-01-12', toDate: '2026-01-15' });

  assert.equal(result.ok, true);
  assert.equal(result.factors.length, 3);
  assert.equal(result.factors[0].date, '2026-01-13');
});

test('cdiDailyFactorProvider: fator exatamente em toDate incluido', async () => {
  const { createStaticCdiDailyFactorProvider } = await loadProvider();
  const provider = createStaticCdiDailyFactorProvider(createFactors());

  const result = provider.getFactors({ fromDate: '2026-01-10', toDate: '2026-01-12' });

  assert.equal(result.ok, true);
  assert.equal(result.factors.length, 2);
  assert.equal(result.factors[0].date, '2026-01-11');
  assert.equal(result.factors[1].date, '2026-01-12');
});

test('cdiDailyFactorProvider: query null retorna INVALID_QUERY', async () => {
  const { createStaticCdiDailyFactorProvider } = await loadProvider();
  const provider = createStaticCdiDailyFactorProvider(createFactors());

  const result = provider.getFactors(null);

  assert.equal(result.ok, false);
  assert.equal(result.error, 'INVALID_QUERY');
});

test('cdiDailyFactorProvider: query array retorna INVALID_QUERY', async () => {
  const { createStaticCdiDailyFactorProvider } = await loadProvider();
  const provider = createStaticCdiDailyFactorProvider(createFactors());

  const result = provider.getFactors(['2026-01-12', '2026-01-14']);

  assert.equal(result.ok, false);
  assert.equal(result.error, 'INVALID_QUERY');
});

test('cdiDailyFactorProvider: query sem fromDate retorna INVALID_QUERY', async () => {
  const { createStaticCdiDailyFactorProvider } = await loadProvider();
  const provider = createStaticCdiDailyFactorProvider(createFactors());

  const result = provider.getFactors({ toDate: '2026-01-14' });

  assert.equal(result.ok, false);
  assert.equal(result.error, 'INVALID_QUERY');
});

test('cdiDailyFactorProvider: query com toDate nao-string retorna INVALID_QUERY', async () => {
  const { createStaticCdiDailyFactorProvider } = await loadProvider();
  const provider = createStaticCdiDailyFactorProvider(createFactors());

  const result = provider.getFactors({ fromDate: '2026-01-12', toDate: 20260114 });

  assert.equal(result.ok, false);
  assert.equal(result.error, 'INVALID_QUERY');
});

test('cdiDailyFactorProvider: fromDate com formato invalido retorna INVALID_QUERY', async () => {
  const { createStaticCdiDailyFactorProvider } = await loadProvider();
  const provider = createStaticCdiDailyFactorProvider(createFactors());

  const result = provider.getFactors({ fromDate: '12/01/2026', toDate: '2026-01-14' });

  assert.equal(result.ok, false);
  assert.equal(result.error, 'INVALID_QUERY');
});

test('cdiDailyFactorProvider: data impossivel retorna INVALID_QUERY', async () => {
  const { createStaticCdiDailyFactorProvider } = await loadProvider();
  const provider = createStaticCdiDailyFactorProvider(createFactors());

  const result = provider.getFactors({ fromDate: '2026-02-30', toDate: '2026-03-01' });

  assert.equal(result.ok, false);
  assert.equal(result.error, 'INVALID_QUERY');
});

test('cdiDailyFactorProvider: data bissexta 2024-02-29 aceita', async () => {
  const { createStaticCdiDailyFactorProvider } = await loadProvider();
  const provider = createStaticCdiDailyFactorProvider([
    { date: '2024-02-29', factor: 1.0004 },
  ]);

  const result = provider.getFactors({ fromDate: '2024-02-28', toDate: '2024-03-01' });

  assert.equal(result.ok, true);
  assert.equal(result.factors.length, 1);
  assert.equal(result.factors[0].date, '2024-02-29');
});

test('cdiDailyFactorProvider: intervalo invertido retorna EMPTY_RANGE', async () => {
  const { createStaticCdiDailyFactorProvider } = await loadProvider();
  const provider = createStaticCdiDailyFactorProvider(createFactors());

  const result = provider.getFactors({ fromDate: '2026-01-15', toDate: '2026-01-12' });

  assert.equal(result.ok, false);
  assert.equal(result.error, 'EMPTY_RANGE');
});

test('cdiDailyFactorProvider: intervalo igual retorna EMPTY_RANGE', async () => {
  const { createStaticCdiDailyFactorProvider } = await loadProvider();
  const provider = createStaticCdiDailyFactorProvider(createFactors());

  const result = provider.getFactors({ fromDate: '2026-01-12', toDate: '2026-01-12' });

  assert.equal(result.ok, false);
  assert.equal(result.error, 'EMPTY_RANGE');
});

test('cdiDailyFactorProvider: intervalo valido sem fatores retorna NO_FACTORS_AVAILABLE', async () => {
  const { createStaticCdiDailyFactorProvider } = await loadProvider();
  const provider = createStaticCdiDailyFactorProvider(createFactors());

  const result = provider.getFactors({ fromDate: '2026-03-01', toDate: '2026-03-10' });

  assert.equal(result.ok, false);
  assert.equal(result.error, 'NO_FACTORS_AVAILABLE');
});

test('cdiDailyFactorProvider: serie vazia retorna NO_FACTORS_AVAILABLE', async () => {
  const { createStaticCdiDailyFactorProvider } = await loadProvider();
  const provider = createStaticCdiDailyFactorProvider([]);

  const result = provider.getFactors({ fromDate: '2026-01-10', toDate: '2026-01-15' });

  assert.equal(result.ok, false);
  assert.equal(result.error, 'NO_FACTORS_AVAILABLE');
});

test('cdiDailyFactorProvider: nao muta fatores de entrada', async () => {
  const { createStaticCdiDailyFactorProvider } = await loadProvider();
  const factors = createFactors();
  const factorsCopy = JSON.parse(JSON.stringify(factors));

  const provider = createStaticCdiDailyFactorProvider(factors);
  provider.getFactors({ fromDate: '2026-01-12', toDate: '2026-01-14' });

  assert.deepEqual(factors, factorsCopy);
  assert.equal(Object.isFrozen(factors), false);
  assert.equal(Object.isFrozen(factors[0]), false);
});

test('cdiDailyFactorProvider: ordem e duplicatas preservadas', async () => {
  const { createStaticCdiDailyFactorProvider } = await loadProvider();
  const provider = createStaticCdiDailyFactorProvider([
    { date: '2026-01-14', factor: 1.0005 },
    { date: '2026-01-13', factor: 1.0004 },
    { date: '2026-01-13', factor: 1.0003 },
  ]);

  const result = provider.getFactors({ fromDate: '2026-01-12', toDate: '2026-01-15' });

  assert.equal(result.ok, true);
  assert.equal(result.factors.length, 3);
  assert.equal(result.factors[0].date, '2026-01-14');
  assert.equal(result.factors[1].date, '2026-01-13');
  assert.equal(result.factors[2].date, '2026-01-13');
});

test('cdiDailyFactorProvider: fatores invalidos preservados se dentro do intervalo', async () => {
  const { createStaticCdiDailyFactorProvider } = await loadProvider();
  const provider = createStaticCdiDailyFactorProvider([
    { date: '2026-01-13', factor: 'invalido' },
    { date: '2026-01-14', factor: NaN },
    { date: '2026-01-15', factor: 0 },
  ]);

  const result = provider.getFactors({ fromDate: '2026-01-12', toDate: '2026-01-16' });

  assert.equal(result.ok, true);
  assert.equal(result.factors.length, 3);
  assert.equal(result.factors[0].factor, 'invalido');
  assert.equal(Number.isNaN(result.factors[1].factor), true);
  assert.equal(result.factors[2].factor, 0);
});

test('cdiDailyFactorProvider: cada chamada devolve copia nova', async () => {
  const { createStaticCdiDailyFactorProvider } = await loadProvider();
  const provider = createStaticCdiDailyFactorProvider(createFactors());

  const first = provider.getFactors({ fromDate: '2026-01-12', toDate: '2026-01-14' });
  const second = provider.getFactors({ fromDate: '2026-01-12', toDate: '2026-01-14' });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.notEqual(first.factors, second.factors);
  assert.notEqual(first.factors[0], second.factors[0]);
  assert.deepEqual(first.factors, second.factors);
});

test('cdiDailyFactorProvider: resultado congelado em todas as camadas', async () => {
  const { createStaticCdiDailyFactorProvider } = await loadProvider();
  const provider = createStaticCdiDailyFactorProvider(createFactors());

  const result = provider.getFactors({ fromDate: '2026-01-12', toDate: '2026-01-14' });

  assert.equal(Object.isFrozen(result), true);
  assert.equal(result.ok, true);
  assert.equal(Object.isFrozen(result.factors), true);
  assert.equal(Object.isFrozen(result.factors[0]), true);
});

test('cdiDailyFactorProvider: determinismo entre chamadas', async () => {
  const { createStaticCdiDailyFactorProvider } = await loadProvider();
  const provider = createStaticCdiDailyFactorProvider(createFactors());

  const first = provider.getFactors({ fromDate: '2026-01-12', toDate: '2026-01-15' });
  const second = provider.getFactors({ fromDate: '2026-01-12', toDate: '2026-01-15' });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.deepEqual(first.factors, second.factors);
});
