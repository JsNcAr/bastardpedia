/**
 * StoryTags: the record a tagging agent produces for one story.
 *
 * Structure lives here; the controlled vocabularies live in tagging/taxonomy/*.yaml.
 * `makeStoryTagsSchema` combines both, so adding a tag to the YAML never needs a code change.
 * The same schema is exported as JSON Schema (tagging/schema/story-tags.schema.json) for
 * API structured output and for agents that validate their own output.
 */
import { z } from 'zod';

export interface Vocabularies {
  formats: readonly [string, ...string[]];
  subjectKinds: readonly [string, ...string[]];
  orgTypes: readonly [string, ...string[]];
  roles: readonly [string, ...string[]];
  themes: readonly [string, ...string[]];
  polities: readonly [string, ...string[]];
  contentWarnings: readonly [string, ...string[]];
}

export const LIMITS = {
  subjects: 5,
  roles: 3,
  secondaryThemes: 8,
  /** The prompt asks for 4-5 secondary themes; 8 is the hard cap. */
  suggestedSecondaryThemes: 5,
  origin: 4,
  setting: 6,
  subdivisions: 6,
  polities: 3,
  contentWarnings: 6,
  keywords: 10,
  evidence: 12,
  summaryMin: 40,
  summaryMax: 300,
} as const;

const year = z.number().int().min(-5000).max(2100);
const iso2 = z.string().regex(/^[A-Z]{2}$/, 'ISO 3166-1 alpha-2, upper case');
const iso3166_2 = z.string().regex(/^[A-Z]{2}-[A-Z0-9]{1,3}$/, 'ISO 3166-2, e.g. US-OR');
const confidence = z.enum(['high', 'medium', 'low']);

const span = z
  .object({ start: year, end: year.nullable() })
  .refine((s) => s.end === null || s.start <= s.end, 'start must be <= end');

/** Covered years always end in a concrete year: the release year for living subjects. */
const closedSpan = z
  .object({ start: year, end: year })
  .refine((s) => s.start <= s.end, 'start must be <= end');

export function makeStoryTagsSchema(v: Vocabularies) {
  const subject = z
    .object({
      name: z.string().min(1).max(120),
      kind: z.enum(v.subjectKinds),
      org_type: z.enum(v.orgTypes).optional(),
      role: z.enum(['primary', 'secondary']),
      lifespan: z.object({ start: year.nullable(), end: year.nullable() }).optional(),
      /** A year the person is known to have been active, when birth and death are unknown. */
      floruit: year.optional(),
      wikidata: z
        .string()
        .regex(/^Q\d+$/)
        .optional(),
    })
    .superRefine((s, ctx) => {
      if (s.kind === 'organization' && !s.org_type) {
        ctx.addIssue({ code: 'custom', message: 'organization subjects need org_type' });
      }
      if (s.kind !== 'organization' && s.org_type) {
        ctx.addIssue({ code: 'custom', message: 'org_type is only for organization subjects' });
      }
      if (s.lifespan && s.kind !== 'person') {
        ctx.addIssue({ code: 'custom', message: 'lifespan is only for person subjects' });
      }
      if (s.floruit !== undefined && s.kind !== 'person') {
        ctx.addIssue({ code: 'custom', message: 'floruit is only for person subjects' });
      }
    });

  return z
    .object({
      story_id: z.string().min(1),
      taxonomy_version: z.string().regex(/^\d+\.\d+\.\d+$/),
      tagged_by: z.object({
        agent: z.string().min(1),
        model: z.string().optional(),
        date: z.iso.date(),
      }),
      format: z.enum(v.formats),
      subjects: z.array(subject).min(1).max(LIMITS.subjects),
      roles: z.array(z.enum(v.roles)).max(LIMITS.roles),
      themes: z.object({
        primary: z.enum(v.themes),
        secondary: z.array(z.enum(v.themes)).max(LIMITS.secondaryThemes),
      }),
      regions: z.object({
        origin: z.array(iso2).max(LIMITS.origin),
        setting: z.array(iso2).max(LIMITS.setting),
        subdivisions: z.array(iso3166_2).max(LIMITS.subdivisions),
        polities: z.array(z.enum(v.polities)).max(LIMITS.polities),
        scope: z.enum(['local', 'national', 'international', 'global', 'online']),
      }),
      time: z
        .object({
          main_span: span,
          covered_span: closedSpan,
          reaches_present: z.boolean(),
          approximate: z.boolean(),
        })
        .refine(
          (t) =>
            t.covered_span.start <= t.main_span.start &&
            (t.main_span.end === null || t.covered_span.end >= t.main_span.end),
          { message: 'covered_span must contain main_span', path: ['covered_span'] },
        )
        .nullable(),
      summary: z.string().min(LIMITS.summaryMin).max(LIMITS.summaryMax),
      content_warnings: z.array(z.enum(v.contentWarnings)).max(LIMITS.contentWarnings),
      keywords: z.array(z.string().min(1).max(60)).max(LIMITS.keywords),
      guests: z.array(z.string().min(1)),
      confidence: z.object({
        subjects: confidence,
        roles: confidence,
        themes: confidence,
        regions: confidence,
        time: confidence,
      }),
      evidence: z
        .array(
          z.object({
            facet: z.enum([
              'format',
              'subjects',
              'roles',
              'themes',
              'regions',
              'time',
              'content_warnings',
            ]),
            part: z.number().int().min(1),
            at: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'HH:MM:SS'),
            note: z.string().max(120),
          }),
        )
        .max(LIMITS.evidence),
      notes: z.string().max(500).optional(),
    })
    .superRefine((t, ctx) => {
      const issue = (message: string, path: (string | number)[]) =>
        ctx.addIssue({ code: 'custom', message, path });

      if (!t.subjects.some((s) => s.role === 'primary')) {
        issue('at least one subject must be primary', ['subjects']);
      }
      if (t.themes.secondary.includes(t.themes.primary)) {
        issue('primary theme must not repeat in secondary', ['themes', 'secondary']);
      }
      if (new Set(t.themes.secondary).size !== t.themes.secondary.length) {
        issue('duplicate secondary themes', ['themes', 'secondary']);
      }
      if (new Set(t.content_warnings).size !== t.content_warnings.length) {
        issue('duplicate content warnings', ['content_warnings']);
      }
      if (new Set(t.roles).size !== t.roles.length) {
        issue('duplicate roles', ['roles']);
      }

      const storyFormats = ['deep-dive', 'media-reading', 'hero', 'current-affairs', 'live-show'];
      const primaryHasPerson = t.subjects.some(
        (s) => s.role === 'primary' && (s.kind === 'person' || s.kind === 'group'),
      );
      if (storyFormats.includes(t.format) && primaryHasPerson && t.roles.length === 0) {
        issue('a primary person/group subject needs at least one role', ['roles']);
      }
      if (storyFormats.includes(t.format) && t.time === null) {
        issue('time is required unless format is crossover or meta', ['time']);
      }
      if (t.regions.scope !== 'online' && t.regions.setting.length === 0) {
        issue('setting needs at least one country unless scope is online', ['regions', 'setting']);
      }
    });
}

export type StoryTags = z.infer<ReturnType<typeof makeStoryTagsSchema>>;
