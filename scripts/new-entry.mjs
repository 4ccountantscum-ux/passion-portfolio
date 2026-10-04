// Creates a new entry from a domain template.
//
// Usage:  npm run new gym-atlas "Gym Name"
//
// Generates the id (from the name), dateAdded (today) and folder, asks a few quick
// questions for the required fields, and writes:
//   src/content/entries/<domain>/<id>/index.md
//   src/content/entries/<domain>/<id>/photos/      (drop photos here)

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createInterface } from 'node:readline';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const ENTRIES_DIR = join(ROOT, 'src', 'content', 'entries');
const TEMPLATES_DIR = join(ROOT, 'templates');
const RESERVED = new Set(['explore']);
const PARTIAL_DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;

const [domain, ...nameParts] = process.argv.slice(2);
const name = nameParts.join(' ').trim();

const available = existsSync(TEMPLATES_DIR)
  ? readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''))
  : [];

if (!domain || !name) {
  fail(`Usage: npm run new <domain> "Entry name"\nExample: npm run new gym-atlas "Gym Name"\nDomains with a template: ${available.join(', ') || 'none'}`);
}
if (!available.includes(domain)) {
  fail(`There is no template for "${domain}" yet. Domains with a template: ${available.join(', ') || 'none'}`);
}
if (!existsSync(join(ENTRIES_DIR, domain))) {
  fail(`There is no content folder for "${domain}" (expected src/content/entries/${domain}/).`);
}

// ── Questions ────────────────────────────────────────────────────────────────

const rl = createInterface({ input: process.stdin, output: process.stdout });
const lines = rl[Symbol.asyncIterator]();

async function ask(question, { required = false, validate } = {}) {
  for (;;) {
    process.stdout.write(question);
    const next = await lines.next();
    if (next.done) fail('\nCancelled.');
    const answer = next.value.trim();
    if (!answer && required) {
      console.log('  This one is required.');
      continue;
    }
    const problem = answer && validate ? validate(answer) : undefined;
    if (problem) {
      console.log(`  ${problem}`);
      continue;
    }
    return answer;
  }
}

const values = { title: name, titleYaml: yaml(name) };

if (domain === 'gym-atlas') {
  console.log(`\nNew Gym Atlas entry: ${name}\n`);
  const city = await ask('City: ', { required: true });
  const country = await ask('Country: ', { required: true });
  const statusAnswer = await ask('Status: (v)isited or (w)ant to visit? ', {
    required: true,
    validate: (a) => (parseStatus(a) ? undefined : 'Type v for visited or w for want to visit.'),
  });
  const status = parseStatus(statusAnswer);
  let visitDates = [];
  if (status === 'visited') {
    const datesAnswer = await ask('When did you visit? (2024, 2024-05 or 2024-05-12; separate several with commas): ', {
      required: true,
      validate: (a) =>
        splitList(a).every((d) => PARTIAL_DATE.test(d)) ? undefined : 'Use a year, year-month or full date, e.g. 2024-05.',
    });
    visitDates = splitList(datesAnswer);
  }
  Object.assign(values, {
    city: yaml(city),
    country: yaml(country),
    status,
    visitDates: `[${visitDates.map(yaml).join(', ')}]`,
    idHint: city,
  });
}

// ── Id, folder, file ─────────────────────────────────────────────────────────

let base = slugify(name);
while (!base) {
  base = slugify(await ask("Couldn't make an id from that name. Type one (lowercase letters, numbers, hyphens): ", { required: true }));
}
rl.close();

const taken = collectIds(ENTRIES_DIR);
const id = uniqueId(base, values.idHint, taken);
const folder = join(ENTRIES_DIR, domain, id);
if (existsSync(folder)) fail(`The folder ${relative(ROOT, folder)} already exists.`);

Object.assign(values, { id, dateAdded: today() });
const template = readFileSync(join(TEMPLATES_DIR, `${domain}.md`), 'utf8');
const content = template.replace(/\{\{(\w+)\}\}/g, (match, key) => values[key] ?? match);

mkdirSync(join(folder, 'photos'), { recursive: true });
const file = join(folder, 'index.md');
writeFileSync(file, content);

console.log(`
Created ${relative(ROOT, file).replace(/\\/g, '/')}
  id:     ${id}
  URL:    /${domain}/${id}
  Photos: put them in ${relative(ROOT, join(folder, 'photos')).replace(/\\/g, '/')}/ and list them under "photos:" in the file.
`);

// ── Helpers ──────────────────────────────────────────────────────────────────

function fail(message) {
  console.error(message);
  process.exit(1);
}

/** Double-quoted YAML string (JSON strings are valid YAML). */
function yaml(value) {
  return JSON.stringify(value);
}

function parseStatus(answer) {
  const a = answer.toLowerCase();
  if (['v', 'visited'].includes(a)) return 'visited';
  if (['w', 'want', 'want-to-visit', 'want to visit'].includes(a)) return 'want-to-visit';
  return undefined;
}

function splitList(answer) {
  return answer.split(',').map((s) => s.trim()).filter(Boolean);
}

function slugify(text) {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** All ids already used by any entry, in any domain. */
function collectIds(dir) {
  const ids = new Set();
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) {
      collectIds(path).forEach((i) => ids.add(i));
    } else if (item.name.endsWith('.md')) {
      const match = readFileSync(path, 'utf8').match(/^id:\s*["']?([^"'\s#]+)/m);
      if (match) ids.add(match[1]);
    }
  }
  return ids;
}

/** base → base-<hint> → base-<hint>-2 → … until unused. */
function uniqueId(base, hint, taken) {
  const isFree = (candidate) => !taken.has(candidate) && !RESERVED.has(candidate);
  if (isFree(base)) return base;
  const withHint = hint ? `${base}-${slugify(hint)}` : base;
  if (withHint !== base && isFree(withHint)) return withHint;
  for (let n = 2; ; n++) {
    if (isFree(`${withHint}-${n}`)) return `${withHint}-${n}`;
  }
}

function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
