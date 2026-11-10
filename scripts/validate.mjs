// Validates package manifests against the Registry's contract for each kind
// (a framework, the default; a plugin; a plugin configuration), the owner
// rule, the name rule, and the category list as it stands in this checkout.
// Prints one line per manifest and exits 1 on any failure. With --json it
// prints the valid manifests as JSON for the workflow to fetch, a plugin with
// its newest version spread beside it.
// Usage: node scripts/validate.mjs [--json] [packages/<owner>/<name>.yaml ...]
// With no paths, every manifest under packages/ is validated; a plugin's name
// and a configuration's plugins are always checked against every manifest.
//
// A framework or a configuration lives at packages/<owner>/<name>.yaml, and a
// plugin at packages/<owner>/plugins/<name>.yaml, so an owner can publish a
// framework and a plugin under one @owner/name: a name is unique within its
// owner and its kind. A plugin listed beside the frameworks before plugins had
// their own folder stays valid there, where older CLIs read it, and its name
// then holds no plugin in the plugins/ folder.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';

// The keys of each kind. A manifest without `kind` is a framework, as every
// manifest was before plugins.
const KINDS = {
  framework: { required: ['repo', 'path', 'ref', 'description', 'category'], optional: ['kind', 'keywords'] },
  config: { required: ['kind', 'repo', 'path', 'ref', 'description', 'category', 'plugins'], optional: ['keywords'] },
  plugin: { required: ['kind', 'repo', 'description', 'versions'], optional: ['keywords'] },
};
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const REPO = /^([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)\/([A-Za-z0-9._-]+)$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(-[0-9A-Za-z.-]+)?$/;
const SHA256 = /^[0-9a-f]{64}$/;
// A plugin's release files: its manifest and its CLI entry always, its app
// entry and its page half when it has them.
const PLUGIN_FILES = { required: ['manifest.yaml', 'cli.js'], optional: ['app.js', 'page.js'] };
const PACKAGE = /^@([^/]+)\/([^/]+)$/;
// packages/<owner>/<name>.yaml for any kind, packages/<owner>/plugins/<name>.yaml for a plugin
const MANIFEST_PATH = /^packages\/([^/]+)\/(plugins\/)?([^/]+)\.yaml$/;

const semverOrder = (a, b) => {
  const [x, y] = [a, b].map((v) => v.split(/[.-]/).slice(0, 3).map(Number));
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2] || (a.includes('-') ? -1 : 0) - (b.includes('-') ? -1 : 0);
};
const newest = (versions) => Object.keys(versions).sort(semverOrder).at(-1);

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

// Every manifest's kind, so a plugin's name is checked unique and a
// configuration's plugins resolved whichever files were given. A name may
// hold a framework or a configuration and a plugin at once, so each is kept.
const listings = [];
for (const file of walk('packages')) {
  const rel = path.relative('.', file).split(path.sep).join('/');
  const match = rel.match(MANIFEST_PATH);
  if (!match) continue;
  try {
    listings.push({ id: `@${match[1]}/${match[3]}`, file: rel, kind: parse(readFileSync(file, 'utf8'))?.kind ?? 'framework' });
  } catch {
    // reported when the file itself is validated
  }
}
const isPlugin = (id) => listings.some((listing) => listing.id === id && listing.kind === 'plugin');
// a plugin's name is one across the Registry, since a root holds one plugin of a name
const pluginNames = new Map();
for (const { id, file, kind } of listings) if (kind === 'plugin') pluginNames.set(id.split('/')[1], [...(pluginNames.get(id.split('/')[1]) ?? []), { id, file }]);

let failed = false;
const valid = [];
for (const file of files) {
  const problems = [];
  const rel = path.relative('.', file).split(path.sep).join('/');
  const match = rel.match(MANIFEST_PATH);
  if (!match) problems.push('a manifest lives at packages/<owner>/<name>.yaml, or a plugin at packages/<owner>/plugins/<name>.yaml');
  const [, owner, pluginFolder, name] = match ?? [];

  let manifest;
  try {
    manifest = parse(readFileSync(file, 'utf8'));
  } catch (cause) {
    problems.push(`not YAML: ${cause.message}`);
  }
  const kind = manifest && typeof manifest === 'object' ? (manifest.kind ?? 'framework') : null;
  if (kind !== null && !(kind in KINDS)) problems.push(`\`kind\` is framework, config, or plugin`);
  else if (pluginFolder && kind !== null && kind !== 'plugin') problems.push(`a plugins/ folder holds plugin listings alone; a ${kind} lives at packages/${owner}/${name}.yaml`);
  else if (manifest && typeof manifest === 'object') {
    const { required, optional } = KINDS[kind];
    const strings = required.filter((key) => !['plugins', 'versions'].includes(key));
    const keys = Object.keys(manifest);
    for (const key of required) if (!(key in manifest)) problems.push(`missing \`${key}\``);
    for (const key of keys) if (!required.includes(key) && !optional.includes(key)) problems.push(`unknown key \`${key}\` for a ${kind}`);
    for (const key of strings) if (key in manifest && typeof manifest[key] !== 'string') problems.push(`\`${key}\` must be a string`);
    if (kind === 'config') {
      if (!Array.isArray(manifest.plugins) || manifest.plugins.length === 0 || manifest.plugins.some((p) => typeof p !== 'string')) problems.push('`plugins` is a list of the plugins whose settings the root offers');
      else
        for (const plugin of manifest.plugins) {
          const listed = plugin.match(PACKAGE);
          if (listed) {
            if (!isPlugin(plugin)) problems.push(`\`${plugin}\` is not a plugin in the Registry`);
          } else if (!KEBAB.test(plugin)) problems.push(`\`${plugin}\` is a core plugin's name or a plugin's @owner/name`);
        }
    }
    if (kind === 'plugin') {
      const holders = pluginNames.get(name) ?? [];
      if (name && holders.length > 1) problems.push(`the plugin name \`${name}\` is listed at ${holders.map((holder) => holder.file).join(' and ')}; a root holds one plugin of a name`);
      const versions = manifest.versions;
      if (!versions || typeof versions !== 'object' || Array.isArray(versions) || Object.keys(versions).length === 0) problems.push('`versions` maps each published version to its `ref` and `files`');
      else
        for (const [version, entry] of Object.entries(versions)) {
          if (!SEMVER.test(version)) problems.push(`version \`${version}\` is not semver`);
          if (!entry || typeof entry !== 'object') {
            problems.push(`version \`${version}\` is a mapping of \`ref\` and \`files\``);
            continue;
          }
          for (const key of Object.keys(entry)) if (!['ref', 'files', 'guest'].includes(key)) problems.push(`version \`${version}\`: unknown key \`${key}\``);
          // the view a public share link draws, beside the files and never in them: eidosmd through 0.22 refuses a whole
          // listing whose files name one it does not know
          if ('guest' in entry && (typeof entry.guest !== 'string' || !SHA256.test(entry.guest))) problems.push(`version \`${version}\`: \`guest\` is the sha256 of its guest.js, 64 lowercase hex characters`);
          if (typeof entry.ref !== 'string' || entry.ref === '') problems.push(`version \`${version}\`: \`ref\` is the tag of its GitHub release`);
          const given = entry.files && typeof entry.files === 'object' ? entry.files : null;
          if (!given) problems.push(`version \`${version}\`: \`files\` maps each release file to its sha256`);
          else {
            for (const file of PLUGIN_FILES.required) if (!(file in given)) problems.push(`version \`${version}\`: missing \`${file}\``);
            for (const [file, hash] of Object.entries(given)) {
              if (![...PLUGIN_FILES.required, ...PLUGIN_FILES.optional].includes(file)) problems.push(`version \`${version}\`: \`${file}\` is not a plugin's file (${[...PLUGIN_FILES.required, ...PLUGIN_FILES.optional].join(', ')})`);
              if (typeof hash !== 'string' || !SHA256.test(hash)) problems.push(`version \`${version}\`: \`${file}\` needs its sha256, 64 lowercase hex characters`);
            }
          }
        }
    }
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
    if (kind === 'plugin') {
      const version = newest(manifest.versions);
      console.error(`✓ ${rel}  @${owner}/${name} (plugin) → ${manifest.repo} ${version} @ ${manifest.versions[version].ref}`);
      valid.push({ file: rel, package: `@${owner}/${name}`, kind, version, ...manifest, ...manifest.versions[version] });
    } else {
      console.error(`✓ ${rel}  @${owner}/${name}${kind === 'config' ? ' (config)' : ''} → ${manifest.repo}/${manifest.path} @ ${manifest.ref}`);
      valid.push({ file: rel, package: `@${owner}/${name}`, kind, ...manifest });
    }
  }
}

if (json) console.log(JSON.stringify(valid));
process.exit(failed ? 1 : 0);
