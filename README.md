# passion-portfolio
Host of my passions.

A living, connected archive built with [Astro](https://astro.build). Each interest is a **domain** (Equipment, Gym Atlas, Masters, …) and every domain shares the same page templates and entry format.

## Running it

```bash
npm install      # first time only
npm run dev      # local preview at http://localhost:4321
npm run build    # builds the static site into dist/
```

## Where things live

| Path | What it is |
|---|---|
| `src/site.ts` | Site name and homepage intro |
| `src/domains.ts` | The list of domains (name, description, explore-page label, entry kinds) |
| `src/content.config.ts` | The shared entry format |
| `src/content/entries/<domain>/` | One Markdown file per entry |
| `src/pages/` | Page templates (shared by all domains) |
| `src/components/` | Reusable building blocks (cards, headers, notes, …) |
| `src/styles/global.css` | Minimal global styling |
| `public/` | Static files such as images (`public/images/...`) |

## URLs

- `/` — Home (splash page)
- `/domains` — domain gateway (one tile per domain)
- `/about` — About
- `/<domain>` — domain landing page, e.g. `/masters`
- `/<domain>/explore` — browse page (Catalog / Map / Network)
- `/<domain>/<slug>` — entry page, e.g. `/masters/placeholder-teacher`

## Content model rules

Every entry has three separate identifiers:

| | Where | Rule |
|---|---|---|
| **`id`** | `id:` in the frontmatter (required) | Permanent, unique across the whole site. **Never change it once published.** All relationships point to it. |
| **`slug`** | `slug:` in the frontmatter (optional, defaults to the `id`) | The URL name. It may change later (only the URL changes). Must be unique within its domain and can't be `explore`. |
| **Domain** | The folder the file is in | The entry's primary placement: which domain shows it and where its URL lives. |

The **file name has no meaning**. Matching it to the `id` is a good habit, but renaming or moving a file never breaks anything.

Choose ids carefully: lowercase, hyphens, specific enough to stay unique (`bruce-lee`, not `lee`).

Other rules:

- **Relationships point to ids**, never to file paths or slugs.
- **Store each relationship once, in one direction.** Don't repeat the same link on both entries; reverse links (backlinks) will be computed automatically later.
- **`dateAdded` is required** and means when the entry was added to the archive, not when the thing itself happened (e.g. a gym visit). That will be a separate, domain-specific field.
- **`kind` means what the thing is** (teacher, concept, book, …), never a status.
- **Gym Atlas status** such as visited / want to visit must be modeled **separately from `kind`** when the real Gym Atlas schema is added.
- **Sources, books, documents and personal experiences can be entries** in their own right, so they can be linked to from many places. Attached files (photos, later PDFs) belong to an entry.

The build stops with a clear message if an `id` is missing or duplicated, two entries would share a URL, a slug is `explore`, `dateAdded` is missing, or a relationship points to an id that doesn't exist.

## Adding an entry

Create a Markdown file in the domain's folder, e.g. `src/content/entries/masters/some-teacher.md`:

```markdown
---
id: some-teacher         # required; permanent, unique, never changes
slug: some-teacher       # optional; URL name, defaults to the id
title: "Entry title"
description: "One-sentence summary shown on cards."
dateAdded: 2026-10-04    # required; when it was added to the archive
kind: teacher            # optional; what the thing is (a kind from src/domains.ts)
tags: ["optional", "tags"]
media:                   # optional; images go in public/
  - src: /images/masters/example.jpg
    alt: "Description of the image"
    caption: "Optional caption"
related:                 # optional; ids of other entries, in any domain
  - some-gym
fields:                  # optional; domain-specific details, free-form for now
  location: "..."
---

Personal notes go here, written in Markdown.
```

## Adding a new domain

1. Add a new object to the `domains` list in `src/domains.ts`.
2. Create a matching folder: `src/content/entries/<new-slug>/`.

A domain slug can't be `domains` or `about`, since those URLs are already pages.

The domain's tile, landing page, explore page, entry pages and navigation link are created automatically. Domains appear in the order they are listed.

## Not built yet

- Interactive map/globe for Gym Atlas
- Concept network for Masters
- Tag pages
- Strict domain-specific schemas (e.g. location/coordinates and visit status for gyms)
- Backlinks, labelled relationships, entries shown in more than one domain
- Redirects from old slugs
- Chronological / timeline views
- PDF and document attachments
