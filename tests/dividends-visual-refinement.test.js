#!/usr/bin/env node
// THIS FILE IS AUTO-GENERATED - DO NOT EDIT MANUALLY
// ANY CHANGES WILL BE LOST ON NEXT BUILD

// Import required modules
const assert = require('node:assert/strict');
const { readFileSync } = require('fs');

// Function to extract overviewBlock from index.html
function getOverviewBlock(indexHtml) {
  const overviewStart = indexHtml.indexOf('const overviewBody=');
  const bodyStart = indexHtml.indexOf('const body=', overviewStart);
  return overviewStart !== -1 && bodyStart !== -1
    ? indexHtml.slice(overviewStart, bodyStart)
    : indexHtml;
}

// Test: overviewBlock should contain the current primary dividend grid
function testOverviewBlockContainsDividendPrimaryGrid() {
  const indexHtml = readFileSync('index.html', 'utf8');
  assert.match(indexHtml, /class="dividend-primary-grid"/);
}

// Test: overviewBlock should contain dividend-history-heading class
function testOverviewBlockContainsDividendHistoryHeading() {
  const indexHtml = readFileSync('index.html', 'utf8');
  assert.match(indexHtml, /class="dividend-history-heading"/);
}

// Test: overviewBlock should contain the current executive KPI builder
function testOverviewBlockContainsDividendExecutiveKpis() {
  const indexHtml = readFileSync('index.html', 'utf8');
  const overviewBlock = getOverviewBlock(indexHtml);
  assert.match(overviewBlock, /dividendExecutiveKpis/);
}

// Test: overviewBlock should NOT contain dividendOverviewRecentPanel template literal
function testOverviewBlockDoesNotContainDividendOverviewRecentPanel() {
  const indexHtml = readFileSync('index.html', 'utf8');
  const overviewBlock = getOverviewBlock(indexHtml);
  assert.notEqual(overviewBlock.includes('${dividendOverviewRecentPanel(rows)}'), true);
}

// Test: overviewBlock should NOT contain 'Histórico recente' text
function testOverviewBlockDoesNotContainHistoricoRecente() {
  const indexHtml = readFileSync('index.html', 'utf8');
  const overviewBlock = getOverviewBlock(indexHtml);
  assert.equal(overviewBlock.includes('Histórico recente'), false);
}

// Run all tests
function runTests() {
  console.log('Running dividend visual refinement tests...');
  testOverviewBlockContainsDividendPrimaryGrid();
  testOverviewBlockContainsDividendHistoryHeading();
  testOverviewBlockContainsDividendExecutiveKpis();
  testOverviewBlockDoesNotContainDividendOverviewRecentPanel();
  testOverviewBlockDoesNotContainHistoricoRecente();
  console.log('All tests passed!');
}

runTests();
