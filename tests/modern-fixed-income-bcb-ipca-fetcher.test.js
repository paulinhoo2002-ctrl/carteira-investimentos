const assert = require('node:assert/strict');
const { it } = require('node:test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const FETCHER_PATH = path.join(
  __dirname,
  '..',
  'modern',
  'src',
  'domain',
  'fixedIncome',
  'bcbIpcaFetcher.ts',
);

async function loadFetcher() {
  return import(pathToFileURL(FETCHER_PATH).href);
}

it('normalizes inclusive civil months into complete SGS date bounds', async () => {
  const { normalizeSgsMonthRange } = await loadFetcher();
  assert.deepEqual(normalizeSgsMonthRange('2022-07', '2022-09'), {
    dataInicial: '01/07/2022',
    dataFinal: '30/09/2022',
  });
  assert.deepEqual(normalizeSgsMonthRange('2024-02', '2024-02'), {
    dataInicial: '01/02/2024',
    dataFinal: '29/02/2024',
  });
});

it('rejects malformed or impossible months before making a request', async () => {
  const { fetchIpcaMonthlyFromBcb, normalizeSgsMonthRange } = await loadFetcher();
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    throw new Error('fetch must not run for invalid request dates');
  };

  try {
    for (const [from, to] of [
      ['07/2022', '2022-09'],
      ['2022-13', '2022-09'],
      ['2022-00', '2022-09'],
      ['2022-02-30', '2022-09'],
      ['2023-02-29', '2023-09'],
      ['2022-07-01', '2022-09'],
      ['2022-09', '2022-08'],
      ['', '2022-09'],
      [null, '2022-09'],
      ['garbage', '2022-09'],
      ['2022-07', null],
    ]) {
      assert.equal(normalizeSgsMonthRange(from, to), null);
      assert.deepEqual(await fetchIpcaMonthlyFromBcb(from, to), {
        ok: false,
        error: 'INVALID_REQUEST_DATE',
      });
    }
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

it('builds a valid SGS 433 request and parses provider monthly dates', async () => {
  const { fetchIpcaMonthlyFromBcb } = await loadFetcher();
  const originalFetch = globalThis.fetch;
  let requestedUrl;
  globalThis.fetch = async (url, options) => {
    requestedUrl = new URL(url);
    assert.equal(options.headers.Accept, 'application/json');
    return {
      ok: true,
      json: async () => [
        { data: '01/08/2022', valor: ' -0,36 ' },
        { data: '01/07/2022', valor: '-0.68' },
      ],
    };
  };

  try {
    const result = await fetchIpcaMonthlyFromBcb('2022-07', '2022-08');
    assert.equal(requestedUrl.pathname, '/dados/serie/bcdata.sgs.433/dados');
    assert.equal(requestedUrl.searchParams.get('formato'), 'json');
    assert.equal(requestedUrl.searchParams.get('dataInicial'), '01/07/2022');
    assert.equal(requestedUrl.searchParams.get('dataFinal'), '31/08/2022');
    assert.equal(result.ok, true);
    assert.deepEqual(result.indices, [
      { date: '2022-07', indexValue: -0.68 },
      { date: '2022-08', indexValue: -0.36 },
    ]);
    assert.equal(result.sourceAsOf, '2022-08');
    assert.equal(result.seriesId, 433);

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => [{ data: '07/2022', valor: '-0.68' }],
    });
    const legacyMonth = await fetchIpcaMonthlyFromBcb('2022-07', '2022-07');
    assert.equal(legacyMonth.ok, true);
    assert.deepEqual(legacyMonth.indices, [{ date: '2022-07', indexValue: -0.68 }]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

it('classifies provider HTTP errors without treating them as empty or zero data', async () => {
  const { fetchIpcaMonthlyFromBcb } = await loadFetcher();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 400 });
  try {
    assert.deepEqual(await fetchIpcaMonthlyFromBcb('2022-07', '2022-07'), {
      ok: false,
      error: 'PROVIDER_HTTP_ERROR',
      httpStatus: 400,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  globalThis.fetch = async () => ({
    ok: false,
    status: 404,
    json: async () => ({ erro: { detail: 'SGSNegocioException: Value(s) not found' } }),
  });
  try {
    assert.deepEqual(await fetchIpcaMonthlyFromBcb('2026-09', '2026-09'), {
      ok: false,
      error: 'EMPTY_RESPONSE',
      httpStatus: 404,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

it('keeps empty, malformed and network-failed provider results explicit', async () => {
  const { fetchIpcaMonthlyFromBcb } = await loadFetcher();
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => ({ ok: true, json: async () => [] });
    assert.deepEqual(await fetchIpcaMonthlyFromBcb('2022-07', '2022-07'), {
      ok: false,
      error: 'EMPTY_RESPONSE',
    });

    globalThis.fetch = async () => ({ ok: true, json: async () => ({ error: 'bad payload' }) });
    assert.deepEqual(await fetchIpcaMonthlyFromBcb('2022-07', '2022-07'), {
      ok: false,
      error: 'MALFORMED_DATA',
    });

    globalThis.fetch = async () => ({
      ok: true,
      json: async () => [{ data: '31/02/2022', valor: '0' }],
    });
    assert.deepEqual(await fetchIpcaMonthlyFromBcb('2022-07', '2022-07'), {
      ok: false,
      error: 'MALFORMED_DATA',
    });

    globalThis.fetch = async () => {
      throw new Error('offline');
    };
    assert.deepEqual(await fetchIpcaMonthlyFromBcb('2022-07', '2022-07'), {
      ok: false,
      error: 'FETCH_FAILED',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
