// Helpers for working with entries across domains.
//
// An entry has three separate identifiers:
//   entry.id         permanent identity (frontmatter `id`); relationships point here
//   entry.data.slug  URL name (frontmatter `slug`, defaulting to the id)
//   folder           primary domain, which decides where the entry is shown

import { getCollection, type CollectionEntry } from 'astro:content';
import { getDomain, type Domain } from '../domains';

export type Entry = CollectionEntry<'entries'>;

const ENTRIES_DIR = 'src/content/entries/';

/** Reserved URL segments that an entry slug may not use. */
const RESERVED_SLUGS = new Set(['explore']);

/** The domain folder the entry's file sits in, e.g. "masters". */
function domainFolder(entry: Entry): string {
  const path = (entry.filePath ?? '').replace(/\\/g, '/');
  const relative = path.includes(ENTRIES_DIR) ? path.split(ENTRIES_DIR)[1] : path;
  const parts = relative.split('/');
  return parts.length > 1 ? parts[0] : '';
}

export function getEntryDomain(entry: Entry): Domain {
  const folder = domainFolder(entry);
  const domain = getDomain(folder);
  if (!domain) {
    throw new Error(
      `Entry "${entry.id}" (${entry.filePath}) must be inside a domain folder listed in src/domains.ts.`,
    );
  }
  return domain;
}

export function entryUrl(entry: Entry): string {
  return `/${getEntryDomain(entry).slug}/${entry.data.slug}`;
}

/** All entries, validated against the domain list, reserved slugs and URL collisions. */
export async function getAllEntries(): Promise<Entry[]> {
  const all = await getCollection('entries');
  const urls = new Map<string, string>();
  for (const entry of all) {
    const slug = entry.data.slug;
    if (RESERVED_SLUGS.has(slug)) {
      throw new Error(`Entry "${entry.id}" uses the reserved slug "${slug}". Give it a different slug.`);
    }
    const url = entryUrl(entry);
    const clash = urls.get(url);
    if (clash) {
      throw new Error(`Entries "${clash}" and "${entry.id}" would both live at ${url}. Change one slug.`);
    }
    urls.set(url, entry.id);
  }
  return all;
}

export async function getEntriesByDomain(domainSlug: string): Promise<Entry[]> {
  const all = await getAllEntries();
  return all
    .filter((e) => getEntryDomain(e).slug === domainSlug)
    .sort((a, b) => a.data.title.localeCompare(b.data.title));
}
