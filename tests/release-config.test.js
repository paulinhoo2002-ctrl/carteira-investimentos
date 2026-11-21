// Release sem commits diretos na main: a configuração do semantic-release não pode escrever no Git.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const releaserc = JSON.parse(read('.releaserc.json'));
const pkg = JSON.parse(read('package.json'));
const workflow = read('.github/workflows/release.yml');

test('semantic-release publica somente a partir da main', () => {
  assert.deepEqual(releaserc.branches, ['main']);
});

test('nenhum plugin de Git ou CHANGELOG escreve commits (GH013 em branch protegida)', () => {
  assert.ok(!releaserc.plugins.includes('@semantic-release/git'));
  assert.ok(!releaserc.plugins.includes('@semantic-release/changelog'));
});

test('tags e GitHub Releases continuam sendo criados pelo plugin github', () => {
  assert.ok(releaserc.plugins.includes('@semantic-release/github'));
  assert.ok(releaserc.plugins.includes('@semantic-release/commit-analyzer'));
  assert.ok(releaserc.plugins.includes('@semantic-release/release-notes-generator'));
});

test('npm não publica: pacote privado', () => {
  assert.equal(pkg.private, true);
});

test('workflow Release não faz push manual nem usa token além do GITHUB_TOKEN', () => {
  assert.doesNotMatch(workflow, /git push/);
  assert.doesNotMatch(workflow, /secrets\.(?!GITHUB_TOKEN|NPM_TOKEN)/);
});

test('permissões do workflow limitadas ao necessário para tag e release', () => {
  assert.match(workflow, /permissions:\s*\n\s*contents: write/);
  assert.doesNotMatch(workflow, /contents: write\s*\n\s*contents: write/);
});
