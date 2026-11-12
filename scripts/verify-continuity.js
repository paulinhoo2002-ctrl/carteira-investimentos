#!/usr/bin/env node
'use strict';
// Verificador offline do registro de continuidade (docs/ai/REGISTRO_CONTINUIDADE.md).
// Só lê arquivos locais e consulta o Git local. Não usa rede nem dependências externas.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const SECTIONS = {
  Tarefas: { cols: ['ID', 'Prioridade', 'Descrição', 'Responsável', 'Dependências', 'Critério de conclusão', 'Status', 'Fase', 'Evidência'] },
  Bloqueios: { cols: ['ID', 'Severidade', 'Descrição', 'Impacto', 'Evidência', 'Condição de desbloqueio', 'Estado'] },
  Decisões: { cols: ['ID', 'Data', 'Decisão', 'Justificativa', 'Evidência', 'Restrições', 'Consequências'] },
  Missões: { cols: ['ID', 'Objetivo', 'Resultado', 'Fase', 'Commit/PR', 'Testes', 'Pendências', 'Evidência'] },
};
const STATUS = new Set(['PENDENTE', 'EM_ANDAMENTO', 'BLOQUEADO', 'CONCLUIDO']);
const FASE = new Set(['IMPLEMENTADO_LOCAL', 'COMMITADO_LOCAL', 'PUBLICADO_BRANCH', 'PR_ABERTO', 'INTEGRADO_MAIN', 'IMPLANTADO', 'HOMOLOGADO', 'NAO_APLICAVEL']);
const SEVERIDADE = new Set(['CRITICA', 'ALTA', 'MEDIA', 'BAIXA']);
const ESTADO_BLOQUEIO = new Set(['ABERTO', 'RESOLVIDO']);
const EXTERNAL = 'fora do repositório';

function parseArgs(argv, defaultRoot) {
  const opts = { root: defaultRoot, file: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') opts.root = path.resolve(argv[++i]);
    else if (argv[i] === '--file') opts.file = path.resolve(argv[++i]);
  }
  return opts;
}

function parseTables(text) {
  const tables = {};
  let section = null;
  let header = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const h = /^##\s+(.+)$/.exec(line);
    if (h) { section = h[1].trim(); header = null; continue; }
    if (!section || !line.startsWith('|')) { header = null; continue; }
    if (/^\|[\s:-]+\|/.test(line) && !/[A-Za-z0-9]/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map(c => c.trim());
    if (!header) { header = cells; tables[section] = tables[section] || { header: cells, rows: [] }; continue; }
    tables[section].rows.push({ cells, line: raw });
  }
  return tables;
}

function gitObjectExists(sha, root) {
  const r = spawnSync('git', ['cat-file', '-e', `${sha}^{commit}`], { cwd: root, encoding: 'utf8' });
  return r.status === 0;
}

function verify(root, file) {
  const errors = [];
  const warnings = [];
  const err = m => errors.push(m);
  const warn = m => warnings.push(m);
  if (!fs.existsSync(file)) return { errors: [`arquivo ausente: ${file}`], warnings, counts: {} };
  const text = fs.readFileSync(file, 'utf8');
  const tables = parseTables(text);
  const counts = {};

  for (const [name, spec] of Object.entries(SECTIONS)) {
    const t = tables[name];
    if (!t) { err(`seção "${name}" sem tabela`); continue; }
    if (t.header.join('|') !== spec.cols.join('|')) err(`seção "${name}": colunas inesperadas (${t.header.join(' | ')})`);
    counts[name] = t.rows.length;
    const seen = new Set();
    for (const row of t.rows) {
      if (row.cells.length !== spec.cols.length) { err(`${name}: linha com ${row.cells.length} colunas (esperado ${spec.cols.length}): ${row.cells[0]}`); continue; }
      const id = row.cells[0];
      if (!id) err(`${name}: linha sem ID`);
      if (seen.has(id)) err(`${name}: ID duplicado ${id}`);
      seen.add(id);
    }
  }

  const ids = {};
  for (const name of Object.keys(SECTIONS)) {
    for (const row of (tables[name] ? tables[name].rows : [])) ids[row.cells[0]] = name;
  }
  const idRe = /\b(T-[A-Z0-9.-]+|B-\d{2}|D-\d{3}|SM[0-9.]+)\b/g;

  const tasks = tables.Tarefas ? tables.Tarefas.rows : [];
  for (const row of tasks) {
    const c = row.cells;
    if (c.length !== 9) continue;
    const [id, , , , deps, , status, fase, evid] = c;
    if (!STATUS.has(status)) err(`${id}: status inválido "${status}"`);
    if (!FASE.has(fase)) err(`${id}: fase inválida "${fase}"`);
    for (const d of (deps.match(idRe) || [])) if (!ids[d]) err(`${id}: dependência inexistente ${d}`);
    if (status === 'BLOQUEADO') {
      const refs = (evid.match(/\bB-\d{2}\b/g) || []).concat(deps.match(/\bB-\d{2}\b/g) || []);
      if (!refs.length) err(`${id}: BLOQUEADO sem bloqueio referenciado`);
      for (const r of refs) if (ids[r] !== 'Bloqueios') err(`${id}: bloqueio inexistente ${r}`);
    }
    if (status === 'CONCLUIDO') {
      if (!evid || evid === '—') err(`${id}: CONCLUIDO sem evidência`);
      const verifiable = (evid.match(/`[0-9a-f]{7,40}`/g) || []).length + (evid.match(/`[^`]+\.(md|js|json|html|yml)`/g) || []).length;
      if (verifiable === 0) err(`${id}: CONCLUIDO sem evidência verificável (commit ou arquivo do repositório)`);
    }
  }

  for (const row of (tables.Bloqueios ? tables.Bloqueios.rows : [])) {
    const c = row.cells;
    if (c.length !== 7) continue;
    if (!SEVERIDADE.has(c[1])) err(`${c[0]}: severidade inválida "${c[1]}"`);
    if (!ESTADO_BLOQUEIO.has(c[6])) err(`${c[0]}: estado de bloqueio inválido "${c[6]}"`);
  }

  for (const row of (tables.Decisões ? tables.Decisões.rows : [])) {
    const c = row.cells;
    if (c.length !== 7) continue;
    if (!/^(\d{4}-\d{2}-\d{2}|n\/d)$/.test(c[1])) err(`${c[0]}: data inválida "${c[1]}"`);
  }

  for (const row of (tables.Missões ? tables.Missões.rows : [])) {
    const c = row.cells;
    if (c.length !== 8) continue;
    if (!FASE.has(c[3])) err(`${c[0]}: fase inválida "${c[3]}"`);
  }

  // Commits citados (em qualquer seção) devem existir no repositório local.
  const shaRe = /`([0-9a-f]{7,40})`/g;
  let m;
  while ((m = shaRe.exec(text))) {
    if (!gitObjectExists(m[1], root)) err(`commit inexistente no repositório local: ${m[1]}`);
  }

  // Caminhos de evidência dentro do repositório devem existir (células sem "fora do repositório").
  for (const name of Object.keys(tables)) {
    for (const row of tables[name].rows) {
      if (row.cells.join(' ').includes(EXTERNAL)) continue;
      for (const p of (row.line.match(/`([^`\s]+\/[^`\s]+\.(md|js|json|html|yml))`/g) || []).map(s => s.slice(1, -1))) {
        if (!fs.existsSync(path.join(root, p))) err(`${name}: caminho de evidência inexistente: ${p}`);
      }
    }
  }

  // Links Markdown internos (PROJECT_STATE.md e o próprio registro).
  for (const doc of [file, path.join(path.dirname(file), 'PROJECT_STATE.md')]) {
    if (!fs.existsSync(doc)) { warn(`documento ausente: ${doc}`); continue; }
    const body = fs.readFileSync(doc, 'utf8');
    for (const lm of body.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = lm[1];
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      const clean = target.split('#')[0];
      if (!clean) continue;
      if (!fs.existsSync(path.resolve(path.dirname(doc), clean))) err(`link interno quebrado em ${path.basename(doc)}: ${target}`);
    }
  }

  return { errors, warnings, counts };
}

if (require.main === module) {
  const repoRoot = path.resolve(__dirname, '..');
  const opts = parseArgs(process.argv.slice(2), repoRoot);
  const file = opts.file || path.join(opts.root, 'docs', 'ai', 'REGISTRO_CONTINUIDADE.md');
  const { errors, warnings, counts } = verify(opts.root, file);
  for (const w of warnings) console.log(`AVISO: ${w}`);
  for (const e of errors) console.log(`ERRO: ${e}`);
  console.log(`verify-continuity: ${errors.length} erro(s), ${warnings.length} aviso(s). Registros: ${JSON.stringify(counts)}`);
  process.exitCode = errors.length ? 1 : 0;
}

module.exports = { verify, parseTables };
