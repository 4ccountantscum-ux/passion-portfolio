// The shared entry format used by every domain.
//
// Entries live in src/content/entries/<domain-folder>/<any-file-name>.md
// or, when they have photos, in their own folder: <domain-folder>/<entry-folder>/index.md + photos/
//   - `id` (frontmatter) is the entry's permanent identity. It never changes.
//     Every relationship points to an id.
//   - `slug` (frontmatter, optional) is the URL name; it defaults to the id and may change.
//   - The folder is the entry's primary domain. The file name has no meaning.
// The text below the frontmatter (the --- block) is the entry's Personal Notes.

import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** Optional text: blank, null or missing all become undefined. */
const optionalText = () =>
  z
    .string()
    .nullish()
    .transform((v) => (v === null || v === undefined || v.trim() === '' ? undefined : v));

/** Optional list: blank, null or missing all become an empty list. */
const optionalList = <T extends z.ZodType>(item: T) =>
  z
    .array(item)
    .nullish()
    .transform((v) => v ?? []);

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
  schema: ({ image }) =>
    z
      .object({
        /** Permanent unique identifier. Never change it once published. */
        id: z.string(),
        /** URL name within the domain. Optional; defaults to the id. */
        slug: z.string().optional(),
        /** Entry name. */
        title: z.string(),
        /** Optional short summary, shown on cards. */
        description: optionalText(),
        /** What the thing is (e.g. teacher, concept, book). Not a status. Matches a domain `kinds` id. */
        kind: optionalText(),
        /** Photos stored next to the entry, e.g. "./photos/front.jpg". Resized automatically. */
        photos: optionalList(
          z.object({
            src: image(),
            alt: optionalText(),
            caption: optionalText(),
          }),
        ),
        /** Videos, as links (YouTube, Vimeo, Instagram, …). */
        videos: optionalList(
          z.object({
            url: z.string(),
            caption: optionalText(),
          }),
        ),
        /** Where information came from: articles, videos, books, … */
        sources: optionalList(
          z.object({
            title: z.string(),
            url: optionalText(),
            note: optionalText(),
          }),
        ),
        /** Optional free-form tags (displayed only; no tag pages yet). */
        tags: optionalList(z.string()),
        /**
         * Links to other entries (in any domain), written as their ids.
         * Store each relationship once, on one side only; reverse links (backlinks) will be computed.
         */
        related: optionalList(reference('entries')),
        /** When the entry was added to the archive (not when the thing itself happened). */
        dateAdded: z.coerce.date(),
        /** Marks an entry as placeholder content. */
        placeholder: z.boolean().default(false),
        /**
         * Domain-specific fields. A domain can define rules for them (`fieldsSchema` in
         * src/domains.ts, e.g. src/schemas/gym-atlas.ts); otherwise they are free-form.
         */
        fields: z
          .record(z.string(), z.unknown())
          .nullish()
          .transform((v) => v ?? {}),
      })
      // An entry without a slug uses its id as its slug.
      .transform((data) => ({ ...data, slug: data.slug ?? data.id })),
});

export const collections = { entries };
