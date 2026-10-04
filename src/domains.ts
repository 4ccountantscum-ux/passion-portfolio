// The list of domains in the archive.
//
// To add a new domain:
//   1. Add an object to the `domains` array below.
//   2. Create a folder with the same `slug` in src/content/entries/.
// Its landing page, explore page, entry pages and nav link are created automatically.

export interface EntryKind {
  /** Value used in an entry's `kind` field, e.g. "teacher". */
  id: string;
  /** Human-readable label, e.g. "Teacher". */
  label: string;
}

export interface Domain {
  /** URL segment and content folder name, e.g. "gym-atlas" → /gym-atlas */
  slug: string;
  /** Display name, used in navigation and headings. */
  name: string;
  /** One-line summary shown on cards. */
  summary: string;
  /** Longer intro shown on the domain landing page. */
  description: string;
  /** The domain's browse page, always at /<slug>/explore. */
  explore: {
    /** What the browse page is called in this domain, e.g. "Map". */
    label: string;
    /** Short description of what the browse page will become. */
    description: string;
  };
  /** Optional sub-types of entries in this domain (e.g. teachers and concepts). */
  kinds?: EntryKind[];
}

export const domains: Domain[] = [
  {
    slug: 'gym-atlas',
    name: 'Gym Atlas',
    summary: 'Gyms I have visited or want to visit, organized geographically.',
    description:
      '[Placeholder] Introduction to the Gym Atlas: gyms visited or on the wish list, organized geographically. Replace this with your own words.',
    explore: {
      label: 'Map',
      description: 'Explore gyms geographically. An interactive map/globe will live here later.',
    },
    // No kinds yet. Visit status (visited / want to visit) is a status, not a kind;
    // it will be modeled separately in the future Gym Atlas schema.
  },
  {
    slug: 'equipment',
    name: 'Equipment',
    summary: 'Interesting, rare, historical, or notable gym equipment.',
    description:
      '[Placeholder] Introduction to the Equipment domain: interesting, rare, historical, or notable gym equipment. Replace this with your own words.',
    explore: {
      label: 'Catalog',
      description: 'Browse every piece of equipment in the archive.',
    },
  },
  {
    slug: 'masters',
    name: 'Masters',
    summary: 'Spiritual and philosophical teachers, concepts, practices, and how they connect.',
    description:
      '[Placeholder] Introduction to Masters: spiritual and philosophical teachers, concepts, practices, and the relationships between them. Replace this with your own words.',
    explore: {
      label: 'Network',
      description: 'Explore teachers and concepts as a connected network. The network view will live here later.',
    },
    kinds: [
      { id: 'teacher', label: 'Teacher' },
      { id: 'concept', label: 'Concept' },
      { id: 'practice', label: 'Practice' },
    ],
  },
];

export function getDomain(slug: string): Domain | undefined {
  return domains.find((d) => d.slug === slug);
}

export function getKindLabel(domain: Domain, kindId: string | undefined): string | undefined {
  if (!kindId) return undefined;
  return domain.kinds?.find((k) => k.id === kindId)?.label ?? kindId;
}
