const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('permanent Superpowers-first governance remains versioned', () => {
  const agents = read('AGENTS.md');
  const legacyRouting = read('docs/SKILLS_ROUTING.md');
  const memory = read('docs/ai/PROJECT_MEMORY.md');
  const policy = JSON.parse(read('docs/ai/skills-governance.json'));
  const routeConfig = JSON.parse(read('docs/ai/skills-routing.json'));
  const skillRouter = read('docs/ai/SKILL_ROUTER.md');

  assert.match(agents, /MANDATORY_FIRST_SKILL=Superpowers/);
  assert.match(agents, /atualização\s+de `docs\/ai\/NEXT_STEP\.md`/);
  assert.match(legacyRouting, /use Superpowers primeiro/);
  assert.match(memory, /Roteamento vigente: .*Superpowers primeiro/);
  assert.equal(policy.superpowers_first, true);
  assert.equal(policy.mission_authorization_has_precedence, true);
  assert.equal(routeConfig.maxSpecialistSkills, 2);
  assert.equal(routeConfig.authorization, 'NEVER_GRANTED_BY_SELECTION');
  assert.match(skillRouter, /Superpowers using-superpowers>Ponytail full>Caveman/);
  assert.match(agents, /seletor .* é consultivo/);
  for (const field of policy.handoff_fields) assert.match(agents, new RegExp(field));
});

test('permanent contract does not grant Git publication authority by mode label', () => {
  const contract = read('docs/ai/PERMANENT_OPERATING_CONTRACT.md');
  const continuity = read('docs/ai/PROJECT_CONTINUITY_POLICY.md');
  assert.match(contract, /autorização humana explícita que cubra ação e escopo/i);
  assert.doesNotMatch(contract, /FULL SAFE.*autoriza.*commits/i);
  assert.match(continuity, /PERMANENT_OPERATING_CONTRACT/);
});

test('runtime-provided Firebase and discovery skills are conditional, not excluded', () => {
  const manifest = read('docs/ai/PROJECT_SKILLS_MANIFEST.md');
  const excludedSection = manifest.split('### EXCLUDED')[1].split('\n---')[0];
  assert.doesNotMatch(excludedSection, /find-skills|firebase-security-rules-auditor/);
  assert.match(manifest, /find-skills[^\n]*(?:conditional|runtime)/i);
  assert.match(manifest, /firebase-security-rules-auditor[^\n]*(?:conditional|runtime)/i);
});
