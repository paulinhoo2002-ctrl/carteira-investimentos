'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyTask, discoverProjectSkills, selectSkills } = require('../scripts/qa/select-skills');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('canonical router and referenced contracts are discoverable without chat context', () => {
  const router = read('.agents/SKILL_ROUTER.md');
  for (const file of ['docs/ai/VISUAL_CANON.md', 'docs/ai/VISUAL_CANON_V2.md', 'docs/ai/DESIGN_SYSTEM.md']) {
    assert.ok(fs.existsSync(path.join(root, file)), `${file} must exist as a visual fallback`);
  }
  assert.match(router, /VISUAL_CANON\.md/);
  assert.match(router, /RESPONSIVE/i);
  assert.match(router, /Acessibilidade/i);
  for (const contract of ['SLIM_UI_CONTRACT', 'RESPONSIVE_CONTRACT', 'ACCESSIBILITY_CONTRACT', 'DESIGN_SYSTEM']) {
    assert.ok(router.includes(contract), `${contract} must be discoverable`);
  }
});

test('mission routes are explicit and only reference available project or runtime skills', () => {
  const catalog = JSON.parse(read('docs/ai/skills-routing.json'));
  const expected = ['UI_UX', 'RESPONSIVE', 'BROWSER_QA', 'DESIGN_SYSTEM', 'FINANCE_CORE',
    'FINANCIAL_RECONCILIATION', 'IR2026', 'PRIVACY_SECURITY', 'RELEASE', 'GOVERNANCE',
    'ARCHITECTURE', 'WORKSPACE_CLEANUP', 'BACKUP_RECOVERY', 'PRODUCTION_INCIDENT'];
  for (const category of expected) assert.ok(catalog.routes[category], `missing route ${category}`);

  const projectSkills = discoverProjectSkills();
  assert.ok(projectSkills.length > 0);
  for (const skill of projectSkills) {
    assert.ok(fs.existsSync(path.join(root, '.agents', 'skills', skill, 'SKILL.md')), `${skill} must have a SKILL.md`);
  }
  for (const candidates of Object.values(catalog.runtimeAliases)) {
    for (const candidate of candidates) assert.ok(catalog.runtimeSkills.includes(candidate), `broken runtime alias ${candidate}`);
  }
  for (const route of Object.values(catalog.routes)) {
    const names = [...(route.required || []), ...(route.alternatives || []).flat(), ...Object.values(route.optional || {})];
    for (const name of names) {
      const resolved = [name, ...(catalog.runtimeAliases?.[name] || [])];
      assert.ok(resolved.some((candidate) => projectSkills.includes(candidate) || catalog.runtimeSkills?.includes(candidate)),
        `unresolvable skill ${name}`);
    }
  }
  assert.equal(catalog.authorization, 'NEVER_GRANTED_BY_SELECTION');
  assert.equal(catalog.modelRouting, undefined, 'skill selection must not depend on model choice');
});

test('zero-chat UI simulation discovers identity, visual gates, and minimal UI skills', () => {
  const agents = read('AGENTS.md');
  const router = read('.agents/SKILL_ROUTER.md');
  assert.match(agents, /PROJECT IDENTITY GATE/);
  assert.match(agents, /SKILL_ROUTER\.md/);
  assert.match(router, /FINANCIAL_CORE|Finance Core/i);
  assert.match(router, /390.*430.*768.*1366.*1920/s);

  const mission = 'Improve Ativos responsive UI';
  const category = classifyTask(mission);
  const selected = selectSkills(category);
  assert.equal(category, 'RESPONSIVE');
  assert.deepEqual(selected.selectedSkills, ['interface-design', 'playwright']);
});

test('zero-chat IR2026 simulation selects finance evidence skills, not visual skills', () => {
  const category = classifyTask('Investigate IR2026 fiscal blocker');
  const selected = selectSkills(category);
  assert.equal(category, 'IR2026');
  assert.deepEqual(selected.selectedSkills, ['doubt-driven-development', 'source-driven-development']);
  assert.ok(!selected.selectedSkills.includes('interface-design'));
});

test('text classifier fails closed when it cannot identify a mission class', () => {
  assert.equal(classifyTask('do something unrelated'), null);
});

test('AGENTS and routing bridge identify one canonical router', () => {
  const agents = read('AGENTS.md');
  const routing = read('docs/ai/SKILLS_ROUTING.md');
  const legacyBridge = read('docs/ai/SKILL_ROUTER.md');
  assert.match(agents, /\.agents\/SKILL_ROUTER\.md/);
  assert.match(routing, /\.agents\/SKILL_ROUTER\.md/);
  assert.match(legacyBridge, /\.agents\/SKILL_ROUTER\.md/);
});
