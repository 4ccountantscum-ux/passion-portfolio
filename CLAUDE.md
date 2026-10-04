# CLAUDE.md

## Project

This repository is a personal website that acts as a living archive of the things I am most curious and passionate about.

It should not feel like:
- a résumé
- a traditional portfolio
- a blog
- a CMS dashboard
- a generic database

It should feel more like:
- an atlas
- an archive
- a knowledge space
- a collection of distinct worlds that can connect to one another

## Current domains

The initial domains are:

- Equipment
- Gym Atlas
- Masters

These are only the first domains. The architecture must make it easy to add entirely new domains later.

## Core architecture

Use domain-first navigation.

Current top-level navigation:
- Home
- Equipment
- Gym Atlas
- Masters
- About

Each domain may eventually have its own visual language and interaction model.

Examples:
- Equipment may feel like a catalog/archive
- Gym Atlas may feel geographic
- Masters may feel like a network or constellation

Do not force every domain into the same visual template beyond what is genuinely reusable.

## Homepage

The homepage should primarily feel like a gateway into the domains.

Avoid:
- dashboard-style layouts
- large grids of generic content cards
- blog-style feeds
- "recently added" as a major organizing principle

The homepage should create curiosity and invite exploration.

## Content

Do not invent real content.

Do not invent:
- people
- biographies
- quotes
- gyms
- equipment
- historical claims
- locations
- lore

Placeholder content must be clearly labeled as placeholder content.

Shared entry structure should stay minimal and flexible.

Do not prematurely lock all domains into the same schema.

## Content model rules

These are structural decisions. Do not change them without approval.

- `id` (frontmatter, required) is the permanent, unique identity of an entry. It never changes once published.
- `slug` (frontmatter, optional, defaults to `id`) is only the URL name and may change later.
- The folder an entry sits in is its primary domain (placement/presentation). The file name has no meaning.
- Relationships always reference `id`, never file paths or slugs.
- Store each relationship once, in one direction. Backlinks and reverse relationships are computed later, never duplicated by hand.
- `dateAdded` is required and means when the entry was added to the archive, not when the thing itself happened.
- `kind` means what the thing is (teacher, concept, book, …), never a status.
- Gym Atlas status (visited / want-to-visit) is `fields.status`, separate from `kind`. Gym Atlas field rules live in `src/schemas/gym-atlas.ts`; its template in `templates/gym-atlas.md`.
- Treat everything stored in the repository as potentially public. There are no private or hidden fields.
- Entry photos live next to their entry (`<entry-folder>/photos/`) and are resized by Astro. Videos are links, not files.
- Sources, books, documents and personal experiences can exist as entries in their own right.

## Implementation principles

Prefer the smallest sufficient implementation.

Do not overengineer.

Prefer:
- simple native Astro features
- reusable structures only when they are genuinely reused
- small focused changes
- minimal dependencies
- readable file organization

Avoid:
- unnecessary abstractions
- unnecessary packages
- complex state management
- premature databases
- premature APIs
- premature maps, graphs, or visualization libraries
- building future features before they are needed

## Workflow

Before making significant structural changes:

1. Inspect the relevant existing files.
2. Explain the proposed change briefly.
3. Identify what files will be created, modified, or deleted.
4. Wait for approval when the change materially affects architecture.

For small approved implementation tasks, make the smallest necessary change.

After completing a task:
- summarize what changed
- mention any important assumptions
- mention anything that still needs review

## Git

Do not commit or push unless explicitly asked.

Do not delete existing work unless explicitly approved.

## Current priority

The current priority is establishing the site's information architecture and visual structure.

Do not optimize for polish or advanced functionality yet.

The site should gradually evolve from a strong structural foundation rather than trying to build the final product immediately.
