/**
 * The catalog: the only data file the app loads (public/data/catalog.json).
 *
 * Built by pipeline/build-catalog.ts from stories + tags + overrides. It carries
 * no transcript text (docs/adr/0007). Derived fields (centuries, eras, continents)
 * are computed at build time so the app only filters.
 */
import { z } from 'zod';

export const CATALOG_SCHEMA = 'catalog/1' as const;

export const TermSchema = z.object({
  id: z.string(),
  label: z.string(),
  definition: z.string(),
  /** Group label for grouped vocabularies (roles, themes). */
  group: z.string().optional(),
});
export type Term = z.infer<typeof TermSchema>;

export const EraSchema = z.object({
  id: z.string(),
  label: z.string(),
  start: z.number().int(),
  end: z.number().int().nullable(),
  scope: z.enum(['global', 'regional']),
  region_hint: z.string().optional(),
  /** Regional eras: where a story must be from or happen to belong to the era. */
  match: z
    .object({
      countries: z.array(z.string()).optional(),
      continents: z.array(z.string()).optional(),
      polities: z.array(z.string()).optional(),
    })
    .optional(),
});
export type Era = z.infer<typeof EraSchema>;

export const CountrySchema = z.object({
  code: z.string().length(2),
  name: z.string(),
  continent: z.string(),
  subregion: z.string(),
});
export type Country = z.infer<typeof CountrySchema>;

const span = z.object({ start: z.number().int(), end: z.number().int().nullable() });

export const CatalogStorySchema = z.object({
  id: z.string(),
  title: z.string(),
  format: z.string(),
  first_published: z.string(),
  parts: z.array(
    z.object({
      title: z.string(),
      part: z.number().int(),
      published: z.string(),
      duration_s: z.number().int().nullable(),
      link: z.string().nullable(),
    }),
  ),
  total_duration_s: z.number().int(),
  guests: z.array(z.string()),
  summary: z.string(),
  subjects: z.array(
    z.object({
      name: z.string(),
      kind: z.string(),
      org_type: z.string().optional(),
      role: z.enum(['primary', 'secondary']),
      lifespan: z
        .object({ start: z.number().int().nullable(), end: z.number().int().nullable() })
        .optional(),
      wikidata: z.string().optional(),
    }),
  ),
  roles: z.array(z.string()),
  themes: z.object({ primary: z.string(), secondary: z.array(z.string()) }),
  regions: z.object({
    origin: z.array(z.string()),
    setting: z.array(z.string()),
    subdivisions: z.array(z.string()),
    polities: z.array(z.string()),
    scope: z.string(),
  }),
  time: z
    .object({
      main_span: span,
      covered_span: z.object({ start: z.number().int(), end: z.number().int() }),
      reaches_present: z.boolean(),
      approximate: z.boolean(),
    })
    .nullable(),
  content_warnings: z.array(z.string()),
  keywords: z.array(z.string()),
  derived: z.object({
    /** From time.covered_span. Century numbers: 19 = 19th century CE, -1 = 1st century BCE. */
    centuries: z.array(z.number().int()),
    eras: z.array(z.string()),
    /** Continents and subregions of origin + setting countries. */
    continents: z.array(z.string()),
    subregions: z.array(z.string()),
  }),
});
export type CatalogStory = z.infer<typeof CatalogStorySchema>;

export const CatalogSchema = z.object({
  schema: z.literal(CATALOG_SCHEMA),
  generated_at: z.string(),
  taxonomy_version: z.string(),
  vocab: z.object({
    formats: z.array(TermSchema),
    roles: z.array(TermSchema),
    themes: z.array(TermSchema),
    polities: z.array(TermSchema),
    content_warnings: z.array(TermSchema),
    subject_kinds: z.array(TermSchema),
    org_types: z.array(TermSchema),
  }),
  eras: z.array(EraSchema),
  /** Only the countries that appear in at least one story. */
  countries: z.array(CountrySchema),
  stories: z.array(CatalogStorySchema),
});
export type Catalog = z.infer<typeof CatalogSchema>;
