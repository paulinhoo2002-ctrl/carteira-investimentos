'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');

test('origin isolation: Firebase persistence is scoped to origin', async () => {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-first-run', '--no-default-browser-check', '--disable-sync']
  });
  const context = await browser.newContext();
  try {
    await context.route('http://localhost:4173/**', route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>origin-isolation-probe</title>'
    }));
    await context.route('http://127.0.0.1:4173/**', route => route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><title>origin-isolation-probe</title>'
    }));

    const page = await context.newPage();
    await page.goto('http://localhost:4173/origin-probe');
    await page.evaluate(() => {
      localStorage.setItem('origin-isolation-probe', 'localhost-only');
      const request = indexedDB.open('firebaseLocalStorageDb', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('firebaseLocalStorage');
    });
    await page.waitForFunction(() => indexedDB.databases().then(databases =>
      databases.some(database => database.name === 'firebaseLocalStorageDb')));

    await page.goto('http://127.0.0.1:4173/origin-probe');
    const isolated = await page.evaluate(async () => ({
      localStorageValue: localStorage.getItem('origin-isolation-probe'),
      databaseNames: (await indexedDB.databases()).map(database => database.name)
    }));

    assert.strictEqual(isolated.localStorageValue, null, 'localStorage should be scoped to the origin');
    assert.strictEqual(isolated.databaseNames.includes('firebaseLocalStorageDb'), false,
      'IndexedDB should be scoped to the origin');
  } finally {
    await context.close();
    await browser.close();
  }
});

test('canonical origin: QA harness defaults to localhost:4173', () => {
  delete process.env.QA_ORIGIN;
  delete require.cache[require.resolve('../scripts/qa/canonical-qa-browser')];
  const qa = require('../scripts/qa/canonical-qa-browser');
  assert.strictEqual(qa.origin, 'http://localhost:4173', 'QA harness origin should default to localhost:4173');
});

test('canonical origin: QA harness can be overridden by environment variable', () => {
  process.env.QA_ORIGIN = 'http://127.0.0.1:4173';
  delete require.cache[require.resolve('../scripts/qa/canonical-qa-browser')];
  const qa = require('../scripts/qa/canonical-qa-browser');
  assert.strictEqual(qa.origin, 'http://127.0.0.1:4173', 'QA harness origin should respect QA_ORIGIN environment variable');
  delete process.env.QA_ORIGIN;
});
