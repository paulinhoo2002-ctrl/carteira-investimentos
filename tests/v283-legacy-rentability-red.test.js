// CLASSIFICATION=SOURCE_GUARD_TESTS
// Detects legacy patterns in index.html source; does not prove runtime reachability.

(function runTests() {
  const fs = require('fs');
  const path = require('path');

  const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

  // Extract rentabilityHistory function body for targeted checks
  const fnStart = indexHtml.indexOf('function rentabilityHistory');
  const fnEnd = indexHtml.indexOf('function ', fnStart + 1);
  const fnBody = indexHtml.slice(fnStart, fnEnd > fnStart ? fnEnd : fnStart + 50000);

  let passed = 0, failed = 0;

  const assertIncludes = (haystack, needle, message) => {
    if (!haystack.includes(needle)) throw new Error('ASSERTION FAILED: ' + message + ' - expected to find "' + needle + '"');
  };

  const assertNotIncludes = (haystack, needle, message) => {
    if (haystack.includes(needle)) throw new Error('ASSERTION FAILED: ' + message + ' - expected NOT to find "' + needle + '"');
  };

  const test = (name, fn) => {
    try { fn(); console.log('✅ ' + name); passed++; }
    catch (e) { console.log('❌ ' + name + ': ' + e.message); failed++; }
  };

  console.log('=== V283 source guards (legacy patterns in source) ===\n');

  // TEST_A1: legacy historical series uses current_price for historical holdings
  test('TEST_A1: rentabilityHistory uses S.assets.current_price for historical valuation', () => {
    assertIncludes(indexHtml, 'priceByTicker.set(tk, Number(a.current_price)||Number(a.price)||0)',
      'rentabilityHistory uses current_price for historical valuation');
    assertIncludes(indexHtml, 'const unitPrice=priceByTicker.get(h.ticker)||Number(h.price)||',
      'historical valuation reads from priceByTicker (current prices)');
  });

  // TEST_A2: legacy uses synthetic benchmark from fixed rate
  test('TEST_A2: rentBenchSeries generates synthetic benchmark from fixed annual rate', () => {
    assertIncludes(indexHtml, 'function rentBenchSeries(length, bench', 'rentBenchSeries function exists');
    assertIncludes(indexHtml, 'const rate=rentBenchRate(bench);', 'uses fixed rate');
    assertIncludes(indexHtml, 'Math.pow(1+rate/100,(i+1)/12)-1', 'compounds fixed rate mathematically');
    assertIncludes(indexHtml, 'const out=[];', 'generates synthetic series');
  });

  // TEST_A3: no check for dated quote evidence before computing historical return
  test('TEST_A3: rentabilityHistory has no check for dated quote evidence', () => {
    assertIncludes(indexHtml, 'function rentabilityHistory', 'function exists');
    const fnStart = indexHtml.indexOf('function rentabilityHistory');
    const fnEnd = indexHtml.indexOf('function ', fnStart + 1);
    const fnBody = indexHtml.slice(fnStart, fnEnd > fnStart ? fnEnd : fnStart + 50000);
    assertNotIncludes(fnBody, 'priceCoverage', 'no priceCoverage check in rentabilityHistory');
    assertNotIncludes(fnBody, 'dated', 'no dated quote check');
    assertNotIncludes(fnBody, 'UNAVAILABLE', 'no unavailable state');
    assertNotIncludes(fnBody, 'INSUFFICIENT_DATA', 'no insufficient data state');
  });

  // TEST_A4: legacy UI renders numbers even when evidence missing
  test('TEST_A4: rentabilityHistory returns numeric results even with no evidence', () => {
    assertIncludes(indexHtml, 'return12m:0', 'returns 0% when no data');
    assertIncludes(indexHtml, 'currentBench:0', 'returns 0 benchmark when no data');
    assertIncludes(indexHtml, 'aboveBench:0', 'returns 0 above bench when no data');
    assertIncludes(fnBody, 'return {', 'returns object with numeric zeros');
    assertIncludes(fnBody, 'current:null, prev12:null, firstView:null, currentBench:0,', 'returns zero metrics');
  });

  // TEST_A5: historical holdings valued with current prices
  test('TEST_A5: historical holdings valued using current_price via priceByTicker', () => {
    assertIncludes(indexHtml, 'const unitPrice=priceByTicker.get(h.ticker)||Number(h.price)||', 'uses priceByTicker (current prices) for historical valuation');
    assertIncludes(indexHtml, 'priceByTicker.set(tk, Number(a.current_price)||Number(a.price)||0)', 'priceByTicker built from current_price');
  });

  // TEST_A6: no priceCoverage/gatedMetric integration in legacy
  test('TEST_A6: rentabilityHistory does not use HistoricalPerformance engine or gatedMetric', () => {
    assertNotIncludes(fnBody, 'HistoricalPerformance', 'legacy does not use HistoricalPerformance engine');
    assertNotIncludes(fnBody, 'calculatePerformance', 'legacy does not use calculatePerformance');
    assertNotIncludes(fnBody, 'gatedMetric', 'legacy does not use gatedMetric');
    assertNotIncludes(fnBody, 'priceCoverage', 'legacy does not check priceCoverage');
    assertNotIncludes(fnBody, 'coverage', 'legacy does not check coverage');
    assertNotIncludes(fnBody, 'INSUFFICIENT_DATA', 'legacy does not return INSUFFICIENT_DATA');
    assertNotIncludes(fnBody, 'UNAVAILABLE', 'legacy does not return UNAVAILABLE');
    assertNotIncludes(fnBody, 'PARTIAL', 'legacy does not return PARTIAL');
  });

  // TEST_A7: current holdings can become historical holdings
  test('TEST_A7: current holdings state used to reconstruct historical holdings', () => {
    assertIncludes(indexHtml, 'const holdings=new Map();', 'builds holdings from current transactions');
    assertIncludes(indexHtml, 'S.aportes', 'uses current aportes for history');
    assertNotIncludes(fnBody, 'snapshot', 'no snapshot-based historical holdings');
    assertNotIncludes(fnBody, 'PortfolioHistory', 'no PortfolioHistory integration');
  });

  // TEST_B1: rentBenchSeries is synthetic fixed-rate compounding
  test('TEST_B1: rentBenchSeries uses synthetic fixed-rate compounding, not real observations', () => {
    assertIncludes(indexHtml, 'const rate=rentBenchRate(bench);', 'uses fixed annual rate');
    assertIncludes(indexHtml, 'Math.pow(1+rate/100,(i+1)/12)-1', 'monthly compounding of fixed rate');
    assertIncludes(indexHtml, 'RENT_BENCH', 'uses fixed RENT_BENCH constants');
    assertNotIncludes(indexHtml, 'SGS', 'no BCB SGS real observations');
    // Check only in rentBenchSeries function body, not whole file
    const benchFnStart = indexHtml.indexOf('function rentBenchSeries');
    const benchFnEnd = indexHtml.indexOf('function ', benchFnStart + 1);
    const benchFnBody = indexHtml.slice(benchFnStart, benchFnEnd > benchFnStart ? benchFnEnd : benchFnStart + 2000);
    assertNotIncludes(benchFnBody, 'observation', 'no real observations in rentBenchSeries');
    assertNotIncludes(benchFnBody, 'series', 'no real series data in rentBenchSeries');
  });

  // TEST_B2: no dated benchmark observations available
  test('TEST_B2: no authoritative dated benchmark series in legacy', () => {
    assertNotIncludes(indexHtml, 'normalizeBenchmark', 'no normalizeBenchmark in legacy');
    assertNotIncludes(fnBody, 'benchmark', 'no real benchmark in legacy rentabilityHistory');
  });

  // TEST_B3: benchmark dates don't align with portfolio (synthetic monthly)
  test('TEST_B3: synthetic benchmark dates are generic monthly, not aligned to portfolio dates', () => {
    assertIncludes(fnBody, 'rentBenchSeries(view.length, bench)', 'benchmark length matches view length, not calendar dates');
    assertNotIncludes(fnBody, 'dateMs', 'no real date alignment');
  });

  // TEST_B4: no benchmark provenance
  test('TEST_B4: no benchmark source/provenance tracking', () => {
    assertNotIncludes(fnBody, 'provenance', 'no provenance in benchmark');
    assertNotIncludes(fnBody, 'sourceIdentity', 'no source identity for benchmark');
  });

  // TEST_B5: benchmark blocks portfolio when missing? No, legacy doesn't use engine
  test('TEST_B5: legacy has no benchmark-engine integration', () => {
    assertNotIncludes(fnBody, 'benchmark', 'legacy rentabilityHistory has no benchmark engine integration');
  });

  console.log('\n=== RESULTS: ' + passed + ' source guards passed, ' + failed + ' failed ===');
  if (failed > 0) process.exit(1);
  console.log('\nSource guards passed; runtime behavior is covered separately.');
})();
