// Validates package manifests against the Registry's contract: the six keys,
// the owner rule, the name rule, and the category list as it stands in this
// checkout. Prints one line per manifest and exits 1 on any failure. With
// --json it prints the valid manifests as JSON for the workflow to fetch.
// Usage: node scripts/validate.mjs [--json] [packages/<owner>/<name>.yaml ...]
// With no paths, every manifest under packages/ is validated.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

const REQUIRED = ['repo', 'path', 'ref', 'description', 'category'];
const OPTIONAL = ['keywords'];
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const REPO = /^([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)\/([A-Za-z0-9._-]+)$/;

const args = process.argv.slice(2);
const json = args.includes('--json');
const given = args.filter((arg) => arg !== '--json');

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : full.endsWith('.yaml') ? [full] : [];
  });
}

// A parent alone is a valid category (a general root, such as a seed), as is
// any `parent/child` it declares.
const categories = new Set(
  (parse(readFileSync('categories.yaml', 'utf8'))?.categories ?? []).flatMap((c) => [c.name, ...(c.children ?? []).map((child) => `${c.name}/${child.name}`)]),
);
const files = given.length > 0 ? given : walk('packages');

let failed = false;
const valid = [];
for (const file of files) {
  const problems = [];
  const rel = path.relative('.', file).split(path.sep).join('/');
  const match = rel.match(/^packages\/([^/]+)\/([^/]+)\.yaml$/);
  if (!match) problems.push('a manifest lives at packages/<owner>/<name>.yaml');
  const [, owner, name] = match ?? [];

  let manifest;
  try {
    manifest = parse(readFileSync(file, 'utf8'));
  } catch (cause) {
    problems.push(`not YAML: ${cause.message}`);
  }
  if (manifest && typeof manifest === 'object') {
    const keys = Object.keys(manifest);
    for (const key of REQUIRED) if (!(key in manifest)) problems.push(`missing \`${key}\``);
    for (const key of keys) if (!REQUIRED.includes(key) && !OPTIONAL.includes(key)) problems.push(`unknown key \`${key}\``);
    for (const key of REQUIRED) if (key in manifest && typeof manifest[key] !== 'string') problems.push(`\`${key}\` must be a string`);
    if ('keywords' in manifest && (!Array.isArray(manifest.keywords) || manifest.keywords.some((k) => typeof k !== 'string'))) problems.push('`keywords` must be a list of strings');
    if (typeof manifest.repo === 'string') {
      const repo = manifest.repo.match(REPO);
      if (!repo) problems.push('`repo` must be `<owner>/<name>` on GitHub');
      else if (owner && repo[1].toLowerCase() !== owner.toLowerCase()) problems.push(`the folder owner \`${owner}\` must equal the repository owner \`${repo[1]}\``);
    }
    if (typeof manifest.description === 'string' && (manifest.description.trim() === '' || manifest.description.includes('\n'))) problems.push('`description` is one non-empty line');
    if (typeof manifest.path === 'string' && (manifest.path === '' || manifest.path.startsWith('/') || manifest.path.split('/').includes('..'))) problems.push('`path` is a folder inside the repository, `.` for its root');
    if (typeof manifest.category === 'string' && !categories.has(manifest.category)) problems.push(`category \`${manifest.category}\` is not in categories.yaml`);
  } else if (manifest !== undefined) {
    problems.push('the manifest is not a mapping');
  }
  if (name && !KEBAB.test(name)) problems.push(`the name \`${name}\` is not kebab-case`);

  if (problems.length > 0) {
    failed = true;
    console.error(`✗ ${rel}`);
    for (const problem of problems) console.error(`    ${problem}`);
  } else {
    console.error(`✓ ${rel}  @${owner}/${name} → ${manifest.repo}/${manifest.path} @ ${manifest.ref}`);
    valid.push({ file: rel, package: `@${owner}/${name}`, ...manifest });
  }
}

if (json) console.log(JSON.stringify(valid));
process.exit(failed ? 1 : 0);
