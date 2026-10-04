// Imports Gym Atlas entries from plain-text blocks.
//
// Usage:  npm run import                 (every .txt file in inbox/)
//         npm run import inbox/file.txt  (specific files)
//
// Each block looks like:
//
//   Gym: Gym Name
//   City: City
//   Country: Country
//   Visited: 2024-05
//   Website: https://...
//   Notes:
//   Free text until the end of the block.
//
// Separate several gyms in one file with a line containing only ---.
// Lines starting with # (before "Notes:") are comments and are ignored.
// A file is imported only if every block in it is valid; nothing is written otherwise.
// Imported files move to inbox/imported/. See templates/gym-atlas.txt for every label.

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import {
  ENTRIES_DIR,
  PARTIAL_DATE,
  ROOT,
  TEMPLATES_DIR,
  collectIds,
  entryFiles,
  fillTemplate,
  parseStatus,
  slugify,
  splitList,
  today,
  uniqueId,
  yaml,
} from './entry-tools.mjs';

const DOMAIN = 'gym-atlas';
const INBOX = join(ROOT, 'inbox');
const IMPORTED = join(INBOX, 'imported');

/** Accepted labels (lowercase) → field name. */
const LABELS = {
  gym: 'title',
  name: 'title',
  city: 'city',
  country: 'country',
  region: 'region',
  state: 'region',
  province: 'region',
  neighborhood: 'neighborhood',
  neighbourhood: 'neighborhood',
  address: 'address',
  coordinates: 'coordinates',
  status: 'status',
  visited: 'visitDates',
  visit: 'visitDates',
  'visit date': 'visitDates',
  'visit dates': 'visitDates',
  website: 'website',
  source: 'source',
  sources: 'source',
  founded: 'founded',
  vibe: 'vibe',
  'went with': 'wentWith',
  'heard about': 'heardAbout',
  'how i heard about it': 'heardAbout',
  'people met': 'peopleMet',
  'notable people': 'notablePeople',
  'notable equipment': 'notableEquipment',
  food: 'nearbyFood',
  'nearby food': 'nearbyFood',
  attractions: 'nearbyAttractions',
  'nearby attractions': 'nearbyAttractions',
  description: 'description',
  related: 'related',
  tags: 'tags',
  notes: 'notes',
};
const REPEATABLE = new Set(['source']);
const LIST_FIELDS = new Set(['wentWith', 'peopleMet', 'notablePeople', 'notableEquipment', 'nearbyFood', 'nearbyAttractions', 'related', 'tags']);
const LABEL_HELP = 'Gym, City, Country, Status, Visited, Website, Source, Region, Neighborhood, Address, Coordinates, Founded, Vibe, Went with, Heard about, People met, Notable people, Notable equipment, Food, Attractions, Description, Related, Tags, Notes';

// ── Which files ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let files;
if (args.length > 0) {
  files = args.map((a) => resolve(a));
} else {
  if (!existsSync(INBOX)) mkdirSync(INBOX);
  files = readdirSync(INBOX)
    .filter((f) => f.toLowerCase().endsWith('.txt'))
    .map((f) => join(INBOX, f));
}
if (files.length === 0) {
  console.log('Nothing to import. Put .txt files in inbox/ (see templates/gym-atlas.txt for the format).');
  process.exit(0);
}

const template = readFileSync(join(TEMPLATES_DIR, `${DOMAIN}.md`), 'utf8');
const taken = collectIds();
const existingGyms = collectGyms();
let created = 0;
let failedFiles = 0;

for (const file of files) {
  const name = relative(ROOT, file).replace(/\\/g, '/');
  if (!existsSync(file)) {
    console.error(`✖ ${name}: file not found`);
    failedFiles++;
    continue;
  }

  // Parse and check every block first, so a file is all-or-nothing.
  const blocks = splitBlocks(readFileSync(file, 'utf8'));
  const problems = [];
  const gyms = [];
  blocks.forEach((block, i) => {
    const where = blocks.length > 1 ? `gym ${i + 1}` : 'gym';
    const { gym, errors } = parseBlock(block);
    errors.forEach((e) => problems.push(`${where}: ${e}`));
    if (errors.length === 0) {
      const key = gymKey(gym.title, gym.city);
      if (existingGyms.has(key)) {
        problems.push(`${where}: "${gym.title}" in ${gym.city} already exists (${existingGyms.get(key)})`);
      } else {
        existingGyms.set(key, '(earlier in this import)');
        gyms.push(gym);
      }
    }
  });
  if (blocks.length === 0) problems.push('no gym information found');

  if (problems.length > 0) {
    console.error(`✖ ${name}: not imported\n${problems.map((p) => `    - ${p}`).join('\n')}`);
    failedFiles++;
    continue;
  }

  console.log(`✔ ${name}`);
  for (const gym of gyms) {
    const id = uniqueId(slugify(gym.title) || 'gym', gym.city, taken);
    taken.add(id);
    const folder = join(ENTRIES_DIR, DOMAIN, id);
    mkdirSync(join(folder, 'photos'), { recursive: true });
    writeFileSync(join(folder, 'index.md'), buildEntry(gym, id));
    created++;
    console.log(`    → ${relative(ROOT, join(folder, 'index.md')).replace(/\\/g, '/')}  (URL /${DOMAIN}/${id}, photos go in ${id}/photos/)`);
  }

  if (resolve(file).startsWith(INBOX) && !resolve(file).startsWith(IMPORTED)) {
    mkdirSync(IMPORTED, { recursive: true });
    renameSync(file, freePath(join(IMPORTED, basename(file))));
  }
}

console.log(`\n${created} ${created === 1 ? 'entry' : 'entries'} created.${failedFiles ? ` ${failedFiles} file(s) not imported; fix them and run again.` : ''}`);
process.exit(failedFiles ? 1 : 0);

// ── Parsing ──────────────────────────────────────────────────────────────────

/** Splits a file into blocks on lines containing only ---. Blocks with only comments are dropped. */
function splitBlocks(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .split(/^\s*---\s*$/m)
    .map((b) => b.trim())
    .filter((b) => b.split('\n').some((line) => line.trim() && !line.trimStart().startsWith('#')));
}

/** Turns one block of "Label: value" lines into a gym object, or a list of errors. */
function parseBlock(block) {
  const values = { source: [] };
  const errors = [];
  const lines = block.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trimStart().startsWith('#')) continue; // blank lines and # comments
    const match = line.match(/^\s*([A-Za-z][A-Za-z ]*?)\s*:\s*(.*)$/);
    const field = match && LABELS[match[1].toLowerCase().replace(/\s+/g, ' ')];
    if (!field) {
      errors.push(`line ${i + 1} isn't a known "Label: value" line: "${line.trim()}". Labels: ${LABEL_HELP}`);
      continue;
    }
    if (field === 'notes') {
      values.notes = [match[2], ...lines.slice(i + 1)].join('\n').trim();
      break;
    }
    const value = match[2].trim();
    if (!value) continue;
    if (REPEATABLE.has(field)) values[field].push(value);
    else if (field in values) errors.push(`"${match[1]}" appears more than once`);
    else values[field] = value;
  }

  for (const [field, label] of [['title', 'Gym'], ['city', 'City'], ['country', 'Country']]) {
    if (!values[field]) errors.push(`"${label}:" is required`);
  }

  const visitDates = values.visitDates ? splitList(values.visitDates) : [];
  const badDates = visitDates.filter((d) => !PARTIAL_DATE.test(d));
  if (badDates.length) errors.push(`visit dates must look like 2024, 2024-05 or 2024-05-12 (got: ${badDates.join(', ')})`);

  let status = visitDates.length > 0 ? 'visited' : 'want-to-visit';
  if (values.status) {
    status = parseStatus(values.status);
    if (!status) errors.push(`"Status:" must be visited or want to visit (got: ${values.status})`);
    else if (status === 'visited' && visitDates.length === 0) errors.push('status is visited, so "Visited:" needs at least one date (a year is enough)');
    else if (status === 'want-to-visit' && visitDates.length > 0) errors.push('status is want to visit, but "Visited:" has dates');
  }

  let coordinates;
  if (values.coordinates) {
    const nums = splitList(values.coordinates).map(Number);
    if (nums.length !== 2 || nums.some((n) => Number.isNaN(n))) errors.push('"Coordinates:" must be two numbers: latitude, longitude');
    else coordinates = nums;
  }

  const sources = [];
  if (values.website) sources.push({ title: 'Website', url: values.website });
  for (const s of values.source) {
    const [first, second] = s.split('|').map((part) => part.trim());
    sources.push(second ? { title: first, url: second } : { title: hostname(first), url: first });
  }

  const gym = { ...values, status, visitDates, coordinates, sources };
  for (const field of LIST_FIELDS) gym[field] = values[field] ? splitList(values[field]) : [];
  return { gym, errors };
}

function hostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

// ── Writing ──────────────────────────────────────────────────────────────────

/** Fills the Gym Atlas template, then sets any optional fields that were provided. */
function buildEntry(gym, id) {
  let text = fillTemplate(template, {
    id,
    dateAdded: today(),
    title: gym.title,
    titleYaml: yaml(gym.title),
    city: yaml(gym.city),
    country: yaml(gym.country),
    status: gym.status,
    visitDates: `[${gym.visitDates.map(yaml).join(', ')}]`,
  });
  text = text.replace(/^# Created with: .*$/m, '# Created with: npm run import');

  const scalars = ['region', 'neighborhood', 'address', 'founded', 'vibe', 'heardAbout', 'description'];
  for (const key of scalars) if (gym[key]) text = setLine(text, key, yaml(gym[key]));
  if (gym.coordinates) text = setLine(text, 'coordinates', `[${gym.coordinates.join(', ')}]`);
  for (const key of LIST_FIELDS) {
    if (gym[key].length) text = setLine(text, key, `[${gym[key].map(key === 'related' ? String : yaml).join(', ')}]`);
  }
  if (gym.sources.length) {
    const block = gym.sources
      .map((s) => `\n  - title: ${yaml(s.title)}\n    url: ${yaml(s.url)}`)
      .join('');
    text = setLine(text, 'sources', block, { dropExampleComments: true });
  }
  if (gym.notes) text = `${text.trimEnd()}\n\n${gym.notes}\n`;
  return text;
}

/** Replaces the first "key: …" line in the frontmatter with "key: value". */
function setLine(text, key, value, { dropExampleComments = false } = {}) {
  const pattern = new RegExp(`^(\\s*)${key}:.*$${dropExampleComments ? '(\\n#.*$)*' : ''}`, 'm');
  return text.replace(pattern, (_, indent) => `${indent}${key}:${value.startsWith('\n') ? '' : ' '}${value}`);
}

/** inbox/imported/name.txt, or name-2.txt, name-3.txt … if taken. */
function freePath(path) {
  if (!existsSync(path)) return path;
  const stem = path.replace(/\.txt$/i, '');
  for (let n = 2; ; n++) if (!existsSync(`${stem}-${n}.txt`)) return `${stem}-${n}.txt`;
}

// ── Duplicate check ──────────────────────────────────────────────────────────

function gymKey(title, city) {
  return `${title.trim().toLowerCase()}|${city.trim().toLowerCase()}`;
}

/** Existing Gym Atlas entries, keyed by name + city. */
function collectGyms() {
  const gyms = new Map();
  const dir = join(ENTRIES_DIR, DOMAIN);
  if (!existsSync(dir)) return gyms;
  for (const file of entryFiles(dir)) {
    const text = readFileSync(file, 'utf8');
    const title = unquote(text.match(/^title:\s*(.+)$/m)?.[1]);
    const city = unquote(text.match(/^\s+city:\s*(.+)$/m)?.[1]);
    if (title && city) gyms.set(gymKey(title, city), relative(ROOT, file).replace(/\\/g, '/'));
  }
  return gyms;
}

function unquote(value) {
  if (!value) return undefined;
  const v = value.replace(/\s+#.*$/, '').trim();
  try {
    return v.startsWith('"') ? JSON.parse(v) : v.replace(/^'(.*)'$/, '$1');
  } catch {
    return v;
  }
}
