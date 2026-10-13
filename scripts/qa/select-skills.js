#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const catalogPath = path.resolve(__dirname, '../../docs/ai/skills-routing.json');

function selectSkills(task, availableSkills, triggers = [], missionContext = null) {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const route = catalog.routes[task];
  if (!route) throw new Error(`Unknown task category: ${task}`);

  const available = new Set(availableSkills);
  const selected = [];
  const missingRequired = [];
  const missingTriggered = [];
  const missingContextual = [];
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

  for (const name of missionContext?.skills || []) consider(name, missingContextual);

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
    missingContextualSkills: missingContextual,
    missionContext: missionContext?.context || null,
    deferredByLimit: overflow,
    authorization: catalog.authorization
  };
}

function selectMissionSkills(context, availableSkills, triggers = []) {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const dimensions = catalog.missionContext?.dimensions || {};
  const provided = context || {};
  for (const [dimension, value] of Object.entries(provided)) {
    if (dimension === 'task') continue;
    if (!Object.hasOwn(dimensions, dimension)) throw new Error(`Unknown mission context dimension: ${dimension}`);
    if (!dimensions[dimension].includes(value)) throw new Error(`Unknown ${dimension} context: ${value}`);
  }
  if (!provided.task) throw new Error('Mission context requires task');
  const selected = (catalog.missionContext?.rules || [])
    .filter((rule) => Object.entries(rule.when).every(([key, value]) => provided[key] === value))
    .flatMap((rule) => rule.skills || []);
  const normalizedContext = Object.fromEntries(['risk', 'domain', 'phase']
    .filter((key) => provided[key] !== undefined)
    .map((key) => [key, provided[key]]));
  return selectSkills(provided.task, availableSkills, triggers, { skills: [...new Set(selected)], context: normalizedContext });
}

if (require.main === module) {
  const [task, ...args] = process.argv.slice(2);
  const availableArg = args.find((arg) => arg.startsWith('--available='));
  const triggersArg = args.find((arg) => arg.startsWith('--triggers='));
  const available = availableArg ? availableArg.slice(12).split(',').filter(Boolean) : [];
  const triggers = triggersArg ? triggersArg.slice(11).split(',').filter(Boolean) : [];
  try {
    const context = Object.fromEntries(['risk', 'domain', 'phase'].flatMap((key) => {
      const option = args.find((arg) => arg.startsWith('--' + key + '='));
      return option ? [[key, option.slice(key.length + 3)]] : [];
    }));
    const result = Object.keys(context).length
      ? selectMissionSkills({ task, ...context }, available, triggers)
      : selectSkills(task, available, triggers);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  }
}
module.exports = { selectSkills, selectMissionSkills };
