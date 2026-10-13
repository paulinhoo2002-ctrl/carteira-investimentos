'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const catalogPath = path.join(root, 'docs/ai/skills-catalog.json');
const routesPath = path.join(root, 'docs/ai/skills-routing.json');

function parseSkillId(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const frontMatter = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  const match = frontMatter?.[1].match(/^name:\s*([^\r\n#]+)\s*$/m);
  return match?.[1].trim().replace(/^['"]|['"]$/g, '') || null;
}

function validateInventory({ skillsRoot, catalog, routes, strictSource = false }) {
  const errors = [];
  const byId = new Map();
  for (const skill of catalog.skills || []) {
    if (!skill.id || byId.has(skill.id)) errors.push(`DUPLICATE_OR_EMPTY_CATALOG_ID:${skill.id || '<empty>'}`);
    else byId.set(skill.id, skill);
    if (!skill.description || !skill.sourcePath || !skill.sourceSha256) errors.push(`INCOMPLETE_CATALOG_ENTRY:${skill.id || '<empty>'}`);
  }

  const directFiles = fs.existsSync(skillsRoot)
    ? fs.readdirSync(skillsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(skillsRoot, entry.name, 'SKILL.md'))
      .filter((file) => fs.existsSync(file))
    : [];
  const seen = new Map();
  const recordedCandidates = new Map((catalog.recursiveCandidates || []).map((entry) => [entry.path.replaceAll('/', path.sep).toLowerCase(), entry]));
  for (const file of directFiles) {
    const id = parseSkillId(file);
    const relative = path.relative(skillsRoot, file).toLowerCase();
    if (!id) {
      if (!strictSource || !recordedCandidates.has(relative)) errors.push(`INVALID_SKILL_FRONTMATTER:${path.relative(root, file).replaceAll('\\', '/')}`);
      continue;
    }
    seen.set(id, [...(seen.get(id) || []), file]);
    if (!byId.has(id)) errors.push(`SKILLS_CATALOG_DRIFT:${id}`);
  }
  for (const [id, files] of seen) {
    if (files.length <= 1) continue;
    const canonicalPath = byId.get(id)?.sourcePath?.replaceAll('/', path.sep).toLowerCase();
    const extras = files.filter((file) => path.relative(skillsRoot, file).toLowerCase() !== canonicalPath);
    if (!strictSource || extras.some((file) => recordedCandidates.get(path.relative(skillsRoot, file).toLowerCase())?.disposition !== 'DUPLICATE_ID_NONCANONICAL_COPY')) {
      errors.push(`DUPLICATE_SKILL_ID:${id}`);
    }
  }

  if (!strictSource) {
    for (const skill of catalog.skills || []) {
      if (skill.repositorySnapshot?.required && !directFiles.includes(path.resolve(root, skill.repositorySnapshot.path))) {
        errors.push(`MISSING_REPOSITORY_SKILL:${skill.id}`);
      }
    }
  } else {
    const expected = new Set((catalog.recursiveCandidates || []).map((entry) => entry.path.replaceAll('/', path.sep).toLowerCase()));
    const actual = [];
    function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(file);
        else if (entry.isFile() && entry.name.toLowerCase() === 'skill.md') actual.push(path.relative(skillsRoot, file).toLowerCase());
      }
    }
    walk(skillsRoot);
    for (const file of actual) if (!expected.has(file)) errors.push(`UNCATALOGED_RECURSIVE_SKILL_FILE:${file}`);
    for (const file of expected) if (!actual.includes(file)) errors.push(`MISSING_SOURCE_CANDIDATE:${file}`);
    for (const candidate of catalog.recursiveCandidates || []) {
      const file = path.join(skillsRoot, candidate.path);
      if (fs.existsSync(file) && candidate.sha256 !== require('node:crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex')) {
        errors.push(`CANDIDATE_HASH_MISMATCH:${candidate.path}`);
      }
    }
    for (const skill of catalog.skills || []) {
      const file = path.join(skillsRoot, skill.sourcePath);
      if (!fs.existsSync(file)) errors.push(`MISSING_SOURCE_SKILL:${skill.id}`);
      else if (skill.sourceSha256 !== require('node:crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex')) errors.push(`SOURCE_HASH_MISMATCH:${skill.id}`);
    }
  }

  const routeRefs = new Set();
  function collect(value) {
    if (typeof value === 'string') routeRefs.add(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
  }
  collect(routes.routes);
  collect(routes.runtimeAliases);
  const runtimeOnly = new Set(catalog.runtimeOnlySkills || []);
  for (const id of routeRefs) {
    if (!byId.has(id) && !runtimeOnly.has(id)) errors.push(`DANGLING_ROUTE_SKILL:${id}`);
  }
  return { ok: errors.length === 0, errors, discovered: directFiles.length, cataloged: byId.size };
}

function main(args = process.argv.slice(2)) {
  const sourceIndex = args.indexOf('--skills-root');
  const skillsRoot = sourceIndex >= 0 ? path.resolve(args[sourceIndex + 1]) : path.join(root, '.agents/skills');
  const strictSource = args.includes('--strict-source');
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  const routes = JSON.parse(fs.readFileSync(routesPath, 'utf8'));
  const result = validateInventory({ skillsRoot, catalog, routes, strictSource });
  console.log(JSON.stringify({ gate: result.ok ? 'PASS' : 'FAIL', mode: strictSource ? 'strict-source' : 'repository-snapshot', ...result }, null, 2));
  if (!result.ok) process.exitCode = 1;
  return result;
}

if (require.main === module) main();
module.exports = { parseSkillId, validateInventory, main };
