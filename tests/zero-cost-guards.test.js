const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const workflow = readFileSync(join(__dirname, '..', '.github/workflows/ci.yml'), 'utf8');
const vercel = JSON.parse(readFileSync(join(__dirname, '..', 'vercel.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

test('CI concurrency isolates PR runs and never cancels main runs', () => {
  const expectedGroup = "  group: ${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}-${{ github.ref == 'refs/heads/main' && github.run_id || 'replaceable' }}";
  assert.ok(workflow.includes('concurrency:'), 'workflow concurrency is required');
  assert.ok(workflow.includes(expectedGroup), 'group must isolate PRs and keep main runs unique');
  assert.ok(workflow.includes("  cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}"), 'only non-main runs may be canceled');
  assert.match(workflow, /push:\s*\n\s+branches:\s*\n\s+- main/);
  assert.match(workflow, /pull_request:\s*\n\s+branches:\s*\n\s+- main/);
  for (const name of ['Build and test', 'V289 visual regression', 'Auth and Firestore emulator QA']) {
    assert.ok(workflow.includes(`name: ${name}`), `missing required CI job: ${name}`);
  }

  const concurrency = ({ event, ref, runId, pullRequestNumber }) => ({
    group: `CI-${pullRequestNumber || ref}-${ref === 'refs/heads/main' ? runId : 'replaceable'}`,
    cancel: ref !== 'refs/heads/main',
    event
  });
  const mainPush1 = concurrency({ event: 'push', ref: 'refs/heads/main', runId: 100 });
  const mainPush2 = concurrency({ event: 'push', ref: 'refs/heads/main', runId: 101 });
  assert.notEqual(mainPush1.group, mainPush2.group, 'main pushes must not replace each other');
  assert.equal(mainPush1.cancel, false);
  assert.equal(concurrency({ event: 'pull_request', ref: 'refs/pull/42/merge', runId: 102, pullRequestNumber: 42 }).cancel, true);
  assert.equal(concurrency({ event: 'workflow_dispatch', ref: 'refs/heads/main', runId: 103 }).cancel, false);
  assert.notEqual(
    concurrency({ event: 'workflow_dispatch', ref: 'refs/heads/main', runId: 103 }).group,
    concurrency({ event: 'workflow_dispatch', ref: 'refs/heads/main', runId: 104 }).group,
    'manual main runs must remain independent'
  );
  assert.equal(concurrency({ event: 'workflow_dispatch', ref: 'refs/heads/codex/task', runId: 105 }).cancel, true);
  assert.doesNotMatch(workflow, /^\s*workflow_dispatch:/m, 'manual runs are not currently an enabled trigger');
});

test('Vercel blocks unknown branches and allows only explicit preview namespaces', () => {
  const policy = vercel.git && vercel.git.deploymentEnabled;
  assert.ok(policy, 'git.deploymentEnabled policy is required');
  assert.equal(policy.main, true, 'main must remain deployable');
  assert.equal(policy['**'], false, 'all branches must be disabled unless explicitly allowed');
  assert.equal(policy['codex/preview/**'], true, 'authorized Codex previews must opt in');
  assert.equal(policy['m5-preview/**'], true, 'authorized M5 previews must opt in');
  assert.ok(pkg.scripts.test.includes('npm run test:zero-cost-guards'), 'npm test must include this policy guard');

  const matches = (pattern, branch) => {
    if (pattern === '**') return true;
    if (!pattern.endsWith('/**')) return pattern === branch;
    return branch.startsWith(pattern.slice(0, -2));
  };
  const shouldDeploy = (branch) => Object.entries(policy)
    .filter(([pattern]) => matches(pattern, branch))
    .some(([, enabled]) => enabled);

  assert.equal(shouldDeploy('main'), true);
  assert.equal(shouldDeploy('production'), false, 'a different configured production branch requires explicit approval');
  assert.equal(shouldDeploy('codex/m560-zero-cost-guards'), false);
  assert.equal(shouldDeploy('codex/m560-3-safe-git-recovery'), false, 'the M560 implementation branch must not create a Preview automatically');
  assert.equal(shouldDeploy('codex/preview/m560-review'), true);
  assert.equal(shouldDeploy('codex/preview'), false);
  assert.equal(shouldDeploy('codex/preview-fake'), false);
  assert.equal(shouldDeploy('m557-a11y-landmarks'), false);
  assert.equal(shouldDeploy('m549-pr520-recovery'), false);
  assert.equal(shouldDeploy('m5-preview/authorized-review'), true);
  assert.equal(shouldDeploy('m5-preview'), false);
  assert.equal(shouldDeploy('m5-preview-extra/task'), false);
  assert.equal(shouldDeploy('feat/user-review'), false);
  assert.equal(shouldDeploy('agent/custom-prefix'), false);
  assert.equal(shouldDeploy('unrecognized-branch'), false);
});
