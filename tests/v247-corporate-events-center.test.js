const test = require('node:test');
const assert = require('node:assert/strict');
const Center = require('../corporate-events-center');

test('Corporate Events Center expõe estado shadow, proveniência e reconciliação', () => {
  const vm = Center.buildViewModel({
    events: [{ type: 'SPLIT', eventDate: '2026-09-01', assetBefore: 'ABCD3', ratio: '1:2', source: 'B3', sourceReference: 'b3-1', quantityBefore: 100 }],
    positions: { ABCD3: { ticker: 'ABCD3', quantity: 200, costBasis: 10000 } }
  });
  assert.equal(vm.summary.detected, 1);
  assert.equal(vm.summary.matches, 1);
  assert.equal(vm.events[0].status, 'MATCH');
  assert.match(Center.render(vm, { escape: value => String(value) }), /Corporate Events/);
  assert.match(Center.render(vm, { escape: value => String(value) }), /Proveniência/);
  assert.doesNotMatch(Center.render(vm, { escape: value => String(value) }), />Aplicar</);
});

test('fila de revisão explicita divergência sem sugerir ação financeira', () => {
  const vm = Center.buildViewModel({ events: [{ type: 'merger', eventDate: '2026-09-01', assetBefore: 'OLD3', assetAfter: 'NEW3', source: 'B3' }], positions: { OLD3: { ticker: 'OLD3', quantity: 10 } } });
  assert.equal(vm.summary.reviewRequired, 1);
  assert.equal(vm.summary.writes, 0);
  const html = Center.render(vm, { escape: value => String(value) });
  assert.match(html, /Revisar/);
  assert.match(html, /REVIEW_REQUIRED/);
  assert.doesNotMatch(html, /Compre|Venda|Oportunidade|Recomendação/);
});
