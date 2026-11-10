'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, '.releaserc.json'), 'utf8'));
const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'release.yml'), 'utf8');

test('release publishes a GitHub release without committing directly to its protected branch', () => {
  assert.ok(config.plugins.includes('@semantic-release/github'));
  assert.ok(config.plugins.includes('@semantic-release/commit-analyzer'));
  assert.ok(config.plugins.includes('@semantic-release/release-notes-generator'));
  assert.equal(config.plugins.includes('@semantic-release/git'), false);
  assert.equal(config.plugins.includes('@semantic-release/npm'), false);
  assert.equal(config.plugins.includes('@semantic-release/changelog'), false);
  assert.doesNotMatch(workflow, /NPM_TOKEN/);
});

test('release runs tests and both builds before semantic-release, without invoking Vercel deployment', () => {
  const testStep = workflow.indexOf('run: npm test');
  const buildStep = workflow.indexOf('run: npm run build && npm run build:modern');
  const releaseStep = workflow.indexOf('run: npx semantic-release');
  assert.ok(testStep >= 0 && buildStep > testStep && releaseStep > buildStep);
  assert.match(workflow, /node --test tests\/release-automation\.test\.js/);
  assert.doesNotMatch(workflow, /vercel\s+deploy/i);
});
