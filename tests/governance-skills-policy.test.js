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
