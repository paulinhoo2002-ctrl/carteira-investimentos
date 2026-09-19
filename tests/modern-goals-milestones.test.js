const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createReadonlyGoalMilestones,
} = require('../modern/src/features/goals/readonlyGoalsViewModel.ts');

test('milestones de meta começam pendentes sem progresso confirmado', () => {
  assert.deepEqual(
    createReadonlyGoalMilestones(0, false).map((item) => item.reached),
    [false, false, false, false],
  );
});

test('milestones de meta acompanham progresso confirmado', () => {
  assert.deepEqual(
    createReadonlyGoalMilestones(62, false).map((item) => item.reached),
    [true, true, false, false],
  );
});

test('meta atingida conclui todos os milestones', () => {
  assert.deepEqual(
    createReadonlyGoalMilestones(100, true).map((item) => item.reached),
    [true, true, true, true],
  );
});
