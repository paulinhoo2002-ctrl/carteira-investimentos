#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const projectSkillsRoot = path.resolve(__dirname, '../../.agents/skills');
const catalogPath = path.resolve(__dirname, '../../docs/ai/skills-routing.json');

function discoverProjectSkills(root = projectSkillsRoot) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(root, entry.name, 'SKILL.md')))
    .map((entry) => entry.name)
    .sort();
}

function classifyTask(description) {
  const text = String(description).toLowerCase();
  if (/ir\s?2026|fiscal|imposto/.test(text)) return 'IR2026';
  if (/responsive|responsiv|mobile|overflow|viewport/.test(text)) return 'RESPONSIVE';
  if (/browser|playwright|smoke|e2e/.test(text)) return 'BROWSER_QA';
  if (/design system|tokens|componentes visuais/.test(text)) return 'DESIGN_SYSTEM';
  if (/reconcil|custodiante|proventos|posi[cç][aã]o financeira/.test(text)) return 'FINANCIAL_RECONCILIATION';
  if (/finance core|c[aá]lculo financeiro/.test(text)) return 'FINANCE_CORE';
  if (/privacidade|seguran[cç]a|firestore rules|auth/.test(text)) return 'PRIVACY_SECURITY';
  if (/backup|restore|recupera/.test(text)) return 'BACKUP_RECOVERY';
  if (/produ[cç][aã]o|incidente|regress[aã]o/.test(text)) return 'PRODUCTION_INCIDENT';
  if (/release|publica[cç][aã]o/.test(text)) return 'RELEASE';
  if (/governan[cç]a|skills|router|agentes/.test(text)) return 'GOVERNANCE';
  if (/arquitetura|architecture/.test(text)) return 'ARCHITECTURE';
  if (/limpeza|cleanup|worktree/.test(text)) return 'WORKSPACE_CLEANUP';
  if (/ui|interface|tela|ativos/.test(text)) return 'UI_UX';
  return null;
}

function selectSkills(task, availableSkills, triggers = []) {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const canonicalTask = catalog.taskAliases?.[task] || task;
  const route = catalog.routes[canonicalTask];
  if (!route) throw new Error(`Unknown task category: ${task}`);

  const discoveredProjectSkills = discoverProjectSkills();
  const available = new Set([...discoveredProjectSkills, ...(availableSkills || [])]);
  const selected = [];
  const missingRequired = [];
  const missingTriggered = [];
  const resolveAvailable = (name) => {
    if (available.has(name)) return name;
    return (catalog.runtimeAliases?.[name] || []).find((candidate) => available.has(candidate)) || null;
  };
  const consider = (name, missing) => {
    const match = resolveAvailable(name);
    if (match && !selected.includes(match)) selected.push(match);
    else if (!match) missing.push(name);
  };

  for (const name of route.required || []) consider(name, missingRequired);
  for (const group of route.alternatives || []) {
    const match = group.map(resolveAvailable).find(Boolean);
    if (match && !selected.includes(match)) selected.push(match);
    else if (!match) missingRequired.push(...group);
  }
  for (const [trigger, name] of Object.entries(route.optional || {})) {
    if (triggers.includes(trigger)) consider(name, missingTriggered);
  }

  const overflow = selected.splice(catalog.maxSpecialistSkills);
  return {
    task: canonicalTask,
    discoveredProjectSkills,
    processContract: catalog.processContract,
    selectedSkills: selected,
    missingRequiredSkills: missingRequired,
    missingTriggeredSkills: missingTriggered,
    deferredByLimit: overflow,
    authorization: catalog.authorization
  };
}

if (require.main === module) {
  const [task, ...args] = process.argv.slice(2);
  const availableArg = args.find((arg) => arg.startsWith('--available='));
  const triggersArg = args.find((arg) => arg.startsWith('--triggers='));
  const available = availableArg ? availableArg.slice(12).split(',').filter(Boolean) : undefined;
  const triggers = triggersArg ? triggersArg.slice(11).split(',').filter(Boolean) : [];
  try {
    process.stdout.write(`${JSON.stringify(selectSkills(task, available, triggers), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  }
}

module.exports = { classifyTask, discoverProjectSkills, selectSkills };
