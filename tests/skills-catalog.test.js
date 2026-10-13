'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const test = require('node:test');
const assert = require('node:assert/strict');
const { validateInventory } = require('../scripts/maintenance/verify-skills-catalog');

function fixture(t, skills) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-catalog-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const [folder, id] of Object.entries(skills)) {
    const dir = path.join(root, folder);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${id}\ndescription: test\n---\n`, 'utf8');
  }
  return root;
}

const entry = (id, folder, required = false) => ({
  id,
  description: 'fixture skill',
  sourcePath: `${folder}/SKILL.md`,
  sourceSha256: 'fixture-hash',
  repositorySnapshot: { required, path: required ? `.agents/skills/${folder}/SKILL.md` : null }
});
const routes = { routes: { ui: { required: ['alpha'], optional: { browser: 'runtime-tool' } } }, runtimeAliases: {} };

test('valid complete inventory passes with an explicit runtime-only route skill', (t) => {
  const skillsRoot = fixture(t, { alpha: 'alpha' });
  const result = validateInventory({ skillsRoot, catalog: { skills: [entry('alpha', 'alpha')], runtimeOnlySkills: ['runtime-tool'] }, routes });
  assert.equal(result.ok, true);
});

test('new physical skill without a catalog entry fails closed', (t) => {
  const skillsRoot = fixture(t, { alpha: 'alpha', beta: 'beta' });
  const result = validateInventory({ skillsRoot, catalog: { skills: [entry('alpha', 'alpha')], runtimeOnlySkills: ['runtime-tool'] }, routes });
  assert.ok(result.errors.includes('SKILLS_CATALOG_DRIFT:beta'));
});

test('a missing repository snapshot skill is reported', (t) => {
  const skillsRoot = fixture(t, {});
  const result = validateInventory({ skillsRoot, catalog: { skills: [entry('alpha', 'alpha', true)], runtimeOnlySkills: ['runtime-tool'] }, routes });
  assert.ok(result.errors.includes('MISSING_REPOSITORY_SKILL:alpha'));
});

test('duplicate ids and dangling route references fail closed', (t) => {
  const skillsRoot = fixture(t, { alpha: 'alpha', duplicate: 'alpha' });
  const result = validateInventory({ skillsRoot, catalog: { skills: [entry('alpha', 'alpha')], runtimeOnlySkills: [] }, routes: { routes: { ui: { required: ['missing'] } } } });
  assert.ok(result.errors.includes('DUPLICATE_SKILL_ID:alpha'));
  assert.ok(result.errors.includes('DANGLING_ROUTE_SKILL:missing'));
});

test('strict source scan detects an uncataloged nested skill file', (t) => {
  const skillsRoot = fixture(t, { alpha: 'alpha' });
  const nested = path.join(skillsRoot, 'vendor', 'new-skill');
  fs.mkdirSync(nested, { recursive: true });
  fs.writeFileSync(path.join(nested, 'SKILL.md'), '---\nname: new-skill\ndescription: test\n---\n', 'utf8');
  const alphaPath = path.join(skillsRoot, 'alpha', 'SKILL.md');
  const alphaHash = crypto.createHash('sha256').update(fs.readFileSync(alphaPath)).digest('hex');
  const result = validateInventory({
    skillsRoot,
    catalog: {
      skills: [{ ...entry('alpha', 'alpha'), sourceSha256: alphaHash }],
      recursiveCandidates: [{ path: 'alpha/SKILL.md', sha256: alphaHash, disposition: 'CATALOGED_PRIMARY' }],
      runtimeOnlySkills: ['runtime-tool']
    },
    routes,
    strictSource: true
  });
  assert.ok(result.errors.includes(`UNCATALOGED_RECURSIVE_SKILL_FILE:${path.join('vendor', 'new-skill', 'skill.md').toLowerCase()}`));
});
