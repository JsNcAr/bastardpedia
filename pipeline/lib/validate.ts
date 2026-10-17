/**
 * Tag-record validation shared by validate-tags.ts and the build. On top of the
 * StoryTags schema it checks things the schema cannot know: the story exists,
 * country codes are real, and the taxonomy version is compatible.
 */
import { isCountryCode } from '../../shared/derive.ts';
import { makeStoryTagsSchema, type StoryTags } from '../../shared/schemas/story-tags.ts';
import { vocabularies, type Taxonomy } from '../../shared/taxonomy.ts';

export interface ValidationResult {
  errors: string[];
  warnings: string[];
  /** Tagged under an earlier version of the current major: still valid, counted, not warned. */
  olderVersion: boolean;
  record: StoryTags | null;
}

export interface ValidationContext {
  taxonomy: Taxonomy;
  /** Ids of stories with kind === 'episode'. */
  episodeStoryIds: ReadonlySet<string>;
  /** Story id -> year its last part was released. Enables the covered-years lifetime rule. */
  releaseYears?: ReadonlyMap<string, number>;
}

/** Formats whose covered years must include the protagonist's whole life. */
export const LIFETIME_FORMATS = ['deep-dive', 'hero', 'live-show'];

/** Story id -> release year of its last part. */
export function releaseYearsOf(
  stories: readonly { id: string; parts: readonly { published: string }[] }[],
): Map<string, number> {
  return new Map(
    stories.map((s) => [s.id, Math.max(...s.parts.map((p) => Number(p.published.slice(0, 4))))]),
  );
}

function major(version: string): string {
  return version.split('.')[0] ?? '';
}

/** Semver order for plain x.y.z strings: negative when a is older. */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}

export function makeValidator(ctx: ValidationContext) {
  const schema = makeStoryTagsSchema(vocabularies(ctx.taxonomy));

  /** `expectedId` is the story id implied by the file name. */
  return function validate(data: unknown, expectedId: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        errors.push(`${issue.path.join('.') || '(root)'}: ${issue.message}`);
      }
      return { errors, warnings, olderVersion: false, record: null };
    }
    const t = parsed.data;

    if (t.story_id !== expectedId)
      errors.push(`story_id "${t.story_id}" does not match the file name "${expectedId}"`);
    if (!ctx.episodeStoryIds.has(t.story_id))
      errors.push(`story_id "${t.story_id}" is not a BtB story in data/stories.json`);

    for (const field of ['origin', 'setting'] as const) {
      t.regions[field].forEach((code, i) => {
        if (!isCountryCode(code))
          errors.push(`regions.${field}.${i}: "${code}" is not an ISO 3166-1 country code`);
      });
    }
    t.regions.subdivisions.forEach((code, i) => {
      const country = code.slice(0, 2);
      if (!isCountryCode(country))
        errors.push(`regions.subdivisions.${i}: "${code}" does not start with a real country code`);
    });

    const released = ctx.releaseYears?.get(t.story_id);
    if (
      t.time &&
      !t.time.partial_life &&
      released !== undefined &&
      LIFETIME_FORMATS.includes(t.format)
    ) {
      const covered = t.time.covered_span;
      for (const s of t.subjects) {
        if (s.role !== 'primary' || s.kind !== 'person' || !s.lifespan) continue;
        const { start, end } = s.lifespan;
        if (start !== null && covered.start > start)
          errors.push(
            `time.covered_span.start ${covered.start} must reach back to ${s.name}'s birth (${start})`,
          );
        const needed = end === null ? released : Math.min(end, released);
        if (covered.end < needed)
          errors.push(
            `time.covered_span.end ${covered.end} must reach ${needed} (${s.name}'s ${end === null || end > released ? 'life up to the release year' : 'death'})`,
          );
      }
    }

    let olderVersion = false;
    if (t.taxonomy_version !== ctx.taxonomy.version) {
      const msg = `taxonomy_version ${t.taxonomy_version} differs from the current ${ctx.taxonomy.version}`;
      if (major(t.taxonomy_version) !== major(ctx.taxonomy.version))
        errors.push(`${msg} (major change: migrate or re-tag)`);
      else if (compareVersions(t.taxonomy_version, ctx.taxonomy.version) < 0) olderVersion = true;
      else warnings.push(`${msg} (newer than the taxonomy)`);
    }

    return { errors, warnings, olderVersion, record: errors.length ? null : t };
  };
}

export type Validator = ReturnType<typeof makeValidator>;
export type { StoryTags };
