'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createRequire } = require('node:module');
const test = require('node:test');

const root = path.join(__dirname, '..');
const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'release.yml'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const releaseTemplate = fs.readFileSync(path.join(root, '.github', 'release-template.md'), 'utf8');
const forbiddenPlugins = new Set([
  '@semantic-release/git',
  '@semantic-release/npm',
  '@semantic-release/changelog',
]);
const requireFromSemanticRelease = createRequire(require.resolve('semantic-release'));
const { cosmiconfig } = requireFromSemanticRelease('cosmiconfig');

async function loadReleaseConfig(cwd) {
  const loaded = await cosmiconfig('release').search(cwd);
  assert.ok(loaded, `semantic-release config was not found in ${cwd}`);
  return loaded.config;
}

function configuredPluginName(plugin) {
  if (typeof plugin === 'string') return plugin;
  if (Array.isArray(plugin)) return configuredPluginName(plugin[0]);
  if (plugin && typeof plugin === 'object') return configuredPluginName(plugin.path);
  return null;
}

function findForbiddenPlugins(config) {
  const plugins = Array.isArray(config?.plugins)
    ? config.plugins
    : config?.plugins == null ? [] : [config.plugins];
  return [...new Set(plugins.map(configuredPluginName).filter(name => forbiddenPlugins.has(name)))];
}

function workflowRunScripts(source) {
  const lines = source.split(/\r?\n/);
  const scripts = [];

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(\s*)(?:-\s*)?run:\s*(.*)$/);
    if (!match) continue;

    const indent = match[1].length;
    const value = match[2].trim();
    if (/^[|>]/.test(value) || value === '') {
      const block = [];
      let next = index + 1;
      for (; next < lines.length; next += 1) {
        const line = lines[next];
        const lineIndent = line.match(/^\s*/)[0].length;
        if (line.trim() && lineIndent <= indent) break;
        block.push(line.trim());
      }
      scripts.push(block.join('\n'));
      index = next - 1;
    } else {
      scripts.push(value.replace(/^(['"])(.*)\1$/, '$2'));
    }
  }
  return scripts;
}

function shellWords(source) {
  const words = [];
  let word = '';
  let quote = null;
  let escaped = false;

  for (const character of source) {
    if (escaped) {
      word += character;
      escaped = false;
    } else if (character === '\\' && quote !== "'") {
      escaped = true;
    } else if (quote) {
      if (character === quote) quote = null;
      else word += character;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (/\s/.test(character)) {
      if (word) words.push(word);
      word = '';
    } else {
      word += character;
    }
  }
  if (word) words.push(word);
  return words;
}

function pushTargetsMain(args) {
  let hasTags = false;
  let pushesAll = false;
  let usesMirror = false;
  let repoOption = false;
  let afterSeparator = false;
  const positional = [];
  const optionsWithValue = new Set(['-o', '--push-option', '--receive-pack', '--exec']);

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (!afterSeparator && argument === '--') {
      afterSeparator = true;
    } else if (!afterSeparator && (argument === '--all' || argument === '--mirror')) {
      if (argument === '--all') pushesAll = true;
      if (argument === '--mirror') usesMirror = true;
    } else if (!afterSeparator && argument === '--tags') {
      hasTags = true;
    } else if (!afterSeparator && (argument === '--repo' || argument === '-r')) {
      repoOption = true;
      index += 1;
    } else if (!afterSeparator && argument.startsWith('--repo=')) {
      repoOption = true;
    } else if (!afterSeparator && optionsWithValue.has(argument)) {
      index += 1;
    } else if (!afterSeparator && argument.startsWith('-')) {
      continue;
    } else {
      positional.push(argument);
    }
  }

  if (pushesAll || usesMirror) return true;
  const refspecs = repoOption ? positional : positional.slice(1);
  if (refspecs.length === 0) return !hasTags;

  return refspecs.some(refspec => {
    const normalized = refspec.replace(/^\+/, '');
    const colon = normalized.lastIndexOf(':');
    const destination = colon >= 0 ? normalized.slice(colon + 1) : normalized;
    return destination.replace(/^refs\/heads\//, '') === 'main';
  });
}

function directMainPushes(workflowSource) {
  const pushes = [];
  for (const script of workflowRunScripts(workflowSource)) {
    for (const line of script.split(/\r?\n/)) {
      const command = line.replace(/^\s*#.*$/, '').trim();
      if (!command) continue;
      for (const segment of command.split(/&&|\|\||[;|]/)) {
        const words = shellWords(segment);
        let index = 0;
        while (['if', 'then', '!', 'command', 'exec', 'sudo'].includes(words[index])) index += 1;
        if (words[index] !== 'git') continue;
        index += 1;
        while (['-C', '-c', '--git-dir', '--work-tree', '--namespace'].includes(words[index])) index += 2;
        if (words[index] !== 'push') continue;
        if (pushTargetsMain(words.slice(index + 1))) pushes.push(segment.trim());
      }
    }
  }
  return pushes;
}

test('active semantic-release configuration publishes a GitHub release without forbidden writers', async () => {
  const config = await loadReleaseConfig(root);
  assert.equal(config.extends, undefined, 'uninspected shareable configs cannot bypass this contract');
  const activePlugins = (Array.isArray(config.plugins) ? config.plugins : [config.plugins]).map(configuredPluginName);
  assert.ok(activePlugins.includes('@semantic-release/github'));
  assert.ok(activePlugins.includes('@semantic-release/commit-analyzer'));
  assert.ok(activePlugins.includes('@semantic-release/release-notes-generator'));
  assert.deepEqual(findForbiddenPlugins(config), []);
  assert.deepEqual(directMainPushes(workflow), []);
  assert.doesNotMatch(workflow, /NPM_TOKEN/);
  assert.match(workflow, /permissions:[\s\S]*?contents:\s*write/);
  assert.match(readme, /semantic-release creates a versioned tag and GitHub Release with generated notes/i);
  assert.match(releaseTemplate, /not updated automatically|não é atualizado automaticamente/i);
});

test('forbidden release plugins are rejected in every supported plugin declaration form', () => {
  for (const plugin of forbiddenPlugins) {
    const declarations = [
      plugin,
      [plugin],
      [plugin, {}],
      [plugin, { assets: ['CHANGELOG.md'] }],
      { path: plugin, assets: ['CHANGELOG.md'] },
    ];
    for (const declaration of declarations) {
      assert.deepEqual(findForbiddenPlugins({ plugins: [declaration] }), [plugin], JSON.stringify(declaration));
    }
  }
});

test('semantic-release alternate package.json config is loaded and checked structurally', async () => {
  const fixtureDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'release-contract-'));
  try {
    fs.writeFileSync(path.join(fixtureDirectory, 'package.json'), JSON.stringify({
      name: 'release-contract-fixture',
      release: { plugins: [['@semantic-release/git', { assets: ['CHANGELOG.md'] }]] },
    }));
    const config = await loadReleaseConfig(fixtureDirectory);
    assert.deepEqual(findForbiddenPlugins(config), ['@semantic-release/git']);
  } finally {
    fs.rmSync(fixtureDirectory, { recursive: true, force: true });
  }
});

test('workflow rejects direct writes to main and permits tag-only publication', () => {
  const directPushCommands = [
    'git push origin main',
    'git push origin HEAD:main',
    'git push origin HEAD:refs/heads/main',
    'git push origin +HEAD:refs/heads/main --force',
    'git push origin refs/heads/topic:refs/heads/main',
    'git push origin --delete main',
  ];
  for (const command of directPushCommands) {
    const syntheticWorkflow = `jobs:\n  release:\n    steps:\n      - run: |\n          ${command}`;
    assert.equal(directMainPushes(syntheticWorkflow).length, 1, command);
  }

  for (const command of ['git push --tags origin', 'git push --tags -- https://example.invalid/repo.git']) {
    const syntheticWorkflow = `jobs:\n  release:\n    steps:\n      - run: |\n          ${command}`;
    assert.deepEqual(directMainPushes(syntheticWorkflow), [], command);
  }
});

test('release runs tests and both builds before semantic-release, without invoking Vercel deployment', () => {
  const testStep = workflow.indexOf('run: npm test');
  const buildStep = workflow.indexOf('run: npm run build && npm run build:modern');
  const releaseStep = workflow.indexOf('run: npx semantic-release');
  assert.ok(testStep >= 0 && buildStep > testStep && releaseStep > buildStep);
  assert.match(workflow, /node --test tests\/release-automation\.test\.js/);
  assert.doesNotMatch(workflow, /vercel\s+deploy/i);
});
