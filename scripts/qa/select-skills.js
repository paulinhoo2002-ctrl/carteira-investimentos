#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const catalogPath = path.resolve(__dirname, '../../docs/ai/skills-routing.json');

function selectSkills(task, availableSkills, triggers = []) {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const route = catalog.routes[task];
  if (!route) throw new Error(`Unknown task category: ${task}`);

  const available = new Set(availableSkills);
  const selected = [];
  const missingRequired = [];
  const missingTriggered = [];
  const consider = (name, missing) => {
    if (selected.includes(name)) return;
    if (available.has(name)) selected.push(name);
    else missing.push(name);
  };

  for (const name of route.required || []) consider(name, missingRequired);
  for (const group of route.alternatives || []) {
    const match = group.find((name) => available.has(name));
    if (match) selected.push(match);
    else missingRequired.push(...group);
  }
  for (const [trigger, name] of Object.entries(route.optional || {})) {
    if (triggers.includes(trigger)) consider(name, missingTriggered);
  }

  const overflow = selected.splice(catalog.maxSpecialistSkills);
  return {
    task,
    processContract: catalog.processContract,
    modelRecommendation: {
      codex: catalog.modelRouting.defaultCodex,
      effort: catalog.modelRouting.effortByTask[task],
      escalation: catalog.modelRouting.codexEscalation,
      escalationTriggers: catalog.modelRouting.escalationTriggers,
      hermesCandidates: catalog.modelRouting.hermesCodingCandidates,
      availabilityRule: catalog.modelRouting.availabilityRule
    },
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
  const available = availableArg ? availableArg.slice(12).split(',').filter(Boolean) : [];
  const triggers = triggersArg ? triggersArg.slice(11).split(',').filter(Boolean) : [];
  try {
    process.stdout.write(`${JSON.stringify(selectSkills(task, available, triggers), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  }
}

module.exports = { selectSkills };
