// Shared helpers for the entry commands (npm run new, npm run import).

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
export const ENTRIES_DIR = join(ROOT, 'src', 'content', 'entries');
export const TEMPLATES_DIR = join(ROOT, 'templates');
export const PARTIAL_DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;

const RESERVED = new Set(['explore']);

/** Double-quoted YAML string (JSON strings are valid YAML). */
export function yaml(value) {
  return JSON.stringify(value);
}

/** "visited" / "v" → visited, "want to visit" / "w" → want-to-visit. */
export function parseStatus(answer) {
  const a = answer.trim().toLowerCase();
  if (['v', 'visited'].includes(a)) return 'visited';
  if (['w', 'want', 'want-to-visit', 'want to visit'].includes(a)) return 'want-to-visit';
  return undefined;
}

/** "a, b , c" → ["a", "b", "c"] */
export function splitList(answer) {
  return answer.split(',').map((s) => s.trim()).filter(Boolean);
}

/** "Gym Name & Co." → "gym-name-and-co" */
export function slugify(text) {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Paths of every entry file (.md) under a folder. */
export function entryFiles(dir = ENTRIES_DIR) {
  const files = [];
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) files.push(...entryFiles(path));
    else if (item.name.endsWith('.md')) files.push(path);
  }
  return files;
}

/** All ids already used by any entry, in any domain. */
export function collectIds() {
  const ids = new Set();
  for (const file of entryFiles()) {
    const match = readFileSync(file, 'utf8').match(/^id:\s*["']?([^"'\s#]+)/m);
    if (match) ids.add(match[1]);
  }
  return ids;
}

/** base → base-<hint> → base-<hint>-2 → … until unused. */
export function uniqueId(base, hint, taken) {
  const isFree = (candidate) => !taken.has(candidate) && !RESERVED.has(candidate);
  if (isFree(base)) return base;
  const withHint = hint ? `${base}-${slugify(hint)}` : base;
  if (withHint !== base && isFree(withHint)) return withHint;
  for (let n = 2; ; n++) {
    if (isFree(`${withHint}-${n}`)) return `${withHint}-${n}`;
  }
}

/** Today's local date as YYYY-MM-DD. */
export function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Fills {{placeholders}} in a template. Unknown placeholders are left as they are. */
export function fillTemplate(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => values[key] ?? match);
}
