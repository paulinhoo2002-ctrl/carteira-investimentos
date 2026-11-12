'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { verify } = require('../scripts/verify-continuity');

const repo = path.join(__dirname, '..');
const HEAD_HEADER = (cols) => `| ${cols.join(' | ')} |\n|${cols.map(() => '---').join('|')}|\n`;
const TASK_COLS = ['ID', 'Prioridade', 'Descrição', 'Responsável', 'Dependências', 'Critério de conclusão', 'Status', 'Fase', 'Evidência'];
const BLOCK_COLS = ['ID', 'Severidade', 'Descrição', 'Impacto', 'Evidência', 'Condição de desbloqueio', 'Estado'];
const DEC_COLS = ['ID', 'Data', 'Decisão', 'Justificativa', 'Evidência', 'Restrições', 'Consequências'];
const MIS_COLS = ['ID', 'Objetivo', 'Resultado', 'Fase', 'Commit/PR', 'Testes', 'Pendências', 'Evidência'];

function makeRegister({ tasks = [], blockers = [], decisions = [], missions = [], state = '' } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sm100-verify-'));
  const docs = path.join(dir, 'docs', 'ai');
  fs.mkdirSync(docs, { recursive: true });
  fs.writeFileSync(path.join(docs, 'PROJECT_STATE.md'), '# Estado\n' + state);
  const body = [
    '# Registro', '',
    '## Tarefas', HEAD_HEADER(TASK_COLS) + tasks.join('\n'), '',
    '## Bloqueios', HEAD_HEADER(BLOCK_COLS) + blockers.join('\n'), '',
    '## Decisões', HEAD_HEADER(DEC_COLS) + decisions.join('\n'), '',
    '## Missões', HEAD_HEADER(MIS_COLS) + missions.join('\n'), '',
  ].join('\n');
  const file = path.join(docs, 'REGISTRO_CONTINUIDADE.md');
  fs.writeFileSync(file, body);
  return { dir, file };
}

const okTask = (id, extra = {}) => `| ${id} | P1 | d | a | — | c | ${extra.status || 'PENDENTE'} | ${extra.fase || 'NAO_APLICAVEL'} | ${extra.evidence || 'fora do repositório: x'} |`;
const okBlock = (id) => `| ${id} | ALTA | d | i | fora do repositório: e | c | ABERTO |`;
const okDec = (id) => `| ${id} | 2026-11-11 | d | j | fora do repositório: e | r | c |`;
const okMis = (id) => `| ${id} | o | r | NAO_APLICAVEL | — | t | p | fora do repositório: e |`;

test('registro válido passa', () => {
  const { dir, file } = makeRegister({
    tasks: [okTask('T-1'), okTask('T-2', { status: 'BLOQUEADO', evidence: 'Bloqueado por B-01' })],
    blockers: [okBlock('B-01')],
    decisions: [okDec('D-001')],
    missions: [okMis('M-1')],
  });
  const r = verify(dir, file);
  assert.deepEqual(r.errors, []);
});

test('detecta ID duplicado, status inválido e fase inválida', () => {
  const { dir, file } = makeRegister({ tasks: [okTask('T-1'), okTask('T-1', { status: 'FEITO', fase: 'MAGICO' })] });
  const msgs = verify(dir, file).errors.join('\n');
  assert.match(msgs, /ID duplicado T-1/);
  assert.match(msgs, /status inválido "FEITO"/);
  assert.match(msgs, /fase inválida "MAGICO"/);
});

test('CONCLUIDO sem evidência verificável é erro', () => {
  const { dir, file } = makeRegister({ tasks: [okTask('T-9', { status: 'CONCLUIDO', evidence: 'feito pelo agente' })] });
  assert.match(verify(dir, file).errors.join('\n'), /CONCLUIDO sem evidência verificável/);
});

test('commit inexistente no repositório local é erro', () => {
  const { dir, file } = makeRegister({ tasks: [okTask('T-7', { status: 'CONCLUIDO', fase: 'COMMITADO_LOCAL', evidence: 'commit `0123456789abcdef0123456789abcdef01234567`' })] });
  assert.match(verify(dir, file).errors.join('\n'), /commit inexistente/);
});

test('BLOQUEADO sem bloqueio referenciado e dependência inexistente são erros', () => {
  const { dir, file } = makeRegister({ tasks: [okTask('T-3', { status: 'BLOQUEADO', evidence: 'sem motivo' }), okTask('T-4', { evidence: 'x' }).replace('| — |', '| T-99 |')] });
  const msgs = verify(dir, file).errors.join('\n');
  assert.match(msgs, /BLOQUEADO sem bloqueio referenciado/);
  assert.match(msgs, /dependência inexistente T-99/);
});

test('link interno quebrado em PROJECT_STATE é erro', () => {
  const { dir, file } = makeRegister({ state: 'Veja [inexistente](NAO_EXISTE.md).\n' });
  assert.match(verify(dir, file).errors.join('\n'), /link interno quebrado/);
});

test('severidade e data inválidas são erros', () => {
  const { dir, file } = makeRegister({ blockers: ['| B-01 | URGENTISSIMA | d | i | e | c | ABERTO |'], decisions: ['| D-001 | ontem | d | j | e | r | c |'] });
  const msgs = verify(dir, file).errors.join('\n');
  assert.match(msgs, /severidade inválida "URGENTISSIMA"/);
  assert.match(msgs, /data inválida "ontem"/);
});

test('registro real do repositório passa', () => {
  const r = verify(repo, path.join(repo, 'docs', 'ai', 'REGISTRO_CONTINUIDADE.md'));
  assert.deepEqual(r.errors, []);
});
