const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('permanent Superpowers-first governance remains versioned', () => {
  const agents = read('AGENTS.md');
  const routing = read('docs/SKILLS_ROUTING.md');
  const memory = read('docs/ai/PROJECT_MEMORY.md');
  const policy = JSON.parse(read('docs/ai/skills-governance.json'));

  assert.match(agents, /SUPERPOWERS_FIRST=true/);
  assert.match(routing, /Superpowers → Skill especializada/);
  assert.match(memory, /Decisão permanente — SUPERPOWERS_FIRST/);
  assert.equal(policy.superpowers_first, true);
  assert.equal(policy.mission_authorization_has_precedence, true);
  for (const field of policy.handoff_fields) assert.match(agents, new RegExp(field));
});
