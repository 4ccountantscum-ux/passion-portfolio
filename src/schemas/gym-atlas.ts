// Gym Atlas: rules for the `fields` block of gym entries.
//
// Required: location.city, location.country, status, and visitDates when status is "visited".
// Everything else is optional and may be left blank ("capture now, refine later").
// Visit status lives here, separate from `kind`.

import { z } from 'astro/zod';

/** Optional text. Blank, null or missing all mean "not filled in yet". Numbers are kept as text. */
const text = () =>
  z
    .union([z.string(), z.number()])
    .nullish()
    .transform((v) => (v === null || v === undefined || String(v).trim() === '' ? undefined : String(v)));

/** Optional list of short text items. Blank or null means an empty list. */
const list = () =>
  z
    .array(z.union([z.string(), z.number()]))
    .nullish()
    .transform((v) => (v ?? []).map(String).filter((s) => s.trim() !== ''));

/** A loose date: "2024", "2024-05" or "2024-05-12". */
const partialDate = z
  .union([z.string(), z.number(), z.date()])
  .transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim()))
  .pipe(z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, 'Use a year, year-month or full date: 2024, 2024-05 or 2024-05-12'));

export const gymStatuses = ['visited', 'want-to-visit'] as const;

export const gymAtlasFields = z
  .strictObject({
    location: z.strictObject({
      city: z.string({ error: 'location.city is required' }).trim().min(1, 'location.city is required'),
      country: z.string({ error: 'location.country is required' }).trim().min(1, 'location.country is required'),
      region: text(),
      neighborhood: text(),
      address: text(),
      /** [latitude, longitude] */
      coordinates: z.tuple([z.number(), z.number()]).nullish().transform((v) => v ?? undefined),
    }),
    status: z.enum(gymStatuses, { error: 'status must be "visited" or "want-to-visit"' }),
    visitDates: z
      .array(partialDate)
      .nullish()
      .transform((v) => (v ?? []).slice().sort()),
    founded: text(),
    vibe: text(),
    wentWith: list(),
    heardAbout: text(),
    peopleMet: list(),
    notablePeople: list(),
    notableEquipment: list(),
    nearbyFood: list(),
    nearbyAttractions: list(),
  })
  .superRefine((data, ctx) => {
    if (data.status === 'visited' && data.visitDates.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['visitDates'],
        message: 'visitDates needs at least one date when status is "visited" (a year is enough)',
      });
    }
  });

export type GymAtlasFields = z.output<typeof gymAtlasFields>;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2024" → "2024", "2024-05" → "May 2024", "2024-05-12" → "12 May 2024" */
export function formatPartialDate(value: string): string {
  const [year, month, day] = value.split('-');
  if (!month) return year;
  const monthName = MONTHS[Number(month) - 1] ?? month;
  return day ? `${Number(day)} ${monthName} ${year}` : `${monthName} ${year}`;
}

/** "Neighborhood, City, Region, Country" with blanks skipped. */
export function formatLocation(location: GymAtlasFields['location']): string {
  return [location.neighborhood, location.city, location.region, location.country].filter(Boolean).join(', ');
}

/** Short text for cards when an entry has no description: its location line. */
export function describeGym(fields: unknown): string | undefined {
  const parsed = gymAtlasFields.safeParse(fields);
  return parsed.success ? formatLocation(parsed.data.location) : undefined;
}
