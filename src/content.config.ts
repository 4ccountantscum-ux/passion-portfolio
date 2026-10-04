// The shared entry format used by every domain.
//
// Entries live in src/content/entries/<domain-folder>/<any-file-name>.md
//   - `id` (frontmatter) is the entry's permanent identity. It never changes.
//     Every relationship points to an id.
//   - `slug` (frontmatter, optional) is the URL name; it defaults to the id and may change.
//   - The folder is the entry's primary domain. The file name has no meaning.
// The text below the frontmatter (the --- block) is the entry's Personal Notes.

import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const entries = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/entries',
    // Identify entries by their frontmatter `id`, not their file path.
    // Duplicate ids fail the build (see prerenderConflictBehavior in astro.config.mjs).
    generateId: ({ entry, data }) => {
      if (typeof data.id !== 'string' || !data.id.trim()) {
        throw new Error(`Entry file "${entry}" is missing an "id" in its frontmatter.`);
      }
      return data.id;
    },
  }),
  schema: z.object({
    /** Permanent unique identifier. Never change it once published. */
    id: z.string(),
    /** URL name within the domain. Optional; defaults to the id. */
    slug: z.string().optional(),
    /** Entry name. */
    title: z.string(),
    /** Short summary, shown on cards. */
    description: z.string(),
    /** What the thing is (e.g. teacher, concept, book). Not a status. Matches a domain `kinds` id. */
    kind: z.string().optional(),
    /** Images. `src` is a path inside /public, e.g. "/images/equipment/foo.jpg". */
    media: z
      .array(
        z.object({
          src: z.string(),
          alt: z.string(),
          caption: z.string().optional(),
        }),
      )
      .default([]),
    /** Optional free-form tags (displayed only; no tag pages yet). */
    tags: z.array(z.string()).default([]),
    /**
     * Links to other entries (in any domain), written as their ids.
     * Store each relationship once, on one side only; reverse links (backlinks) will be computed.
     */
    related: z.array(reference('entries')).default([]),
    /** When the entry was added to the archive (not when the thing itself happened). */
    dateAdded: z.coerce.date(),
    /** Marks an entry as placeholder content. */
    placeholder: z.boolean().default(false),
    /**
     * Domain-specific fields (location, coordinates, manufacturer, lineage, …).
     * Intentionally open for now; these can become strict per-domain schemas later.
     */
    fields: z.record(z.string(), z.unknown()).default({}),
  })
    // An entry without a slug uses its id as its slug.
    .transform((data) => ({ ...data, slug: data.slug ?? data.id })),
});

export const collections = { entries };
