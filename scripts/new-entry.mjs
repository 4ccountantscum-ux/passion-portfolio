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
import {
  ENTRIES_DIR,
  PARTIAL_DATE,
  ROOT,
  TEMPLATES_DIR,
  collectIds,
  fillTemplate,
  parseStatus,
  slugify,
  splitList,
  today,
  uniqueId,
  yaml,
} from './entry-tools.mjs';

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

const taken = collectIds();
const id = uniqueId(base, values.idHint, taken);
const folder = join(ENTRIES_DIR, domain, id);
if (existsSync(folder)) fail(`The folder ${relative(ROOT, folder)} already exists.`);

Object.assign(values, { id, dateAdded: today() });
const template = readFileSync(join(TEMPLATES_DIR, `${domain}.md`), 'utf8');
const content = fillTemplate(template, values);

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
