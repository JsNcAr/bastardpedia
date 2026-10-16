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
  record: StoryTags | null;
}

export interface ValidationContext {
  taxonomy: Taxonomy;
  /** Ids of stories with kind === 'episode'. */
  episodeStoryIds: ReadonlySet<string>;
}

function major(version: string): string {
  return version.split('.')[0] ?? '';
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
      return { errors, warnings, record: null };
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

    if (t.taxonomy_version !== ctx.taxonomy.version) {
      const msg = `taxonomy_version ${t.taxonomy_version} differs from the current ${ctx.taxonomy.version}`;
      if (major(t.taxonomy_version) !== major(ctx.taxonomy.version))
        errors.push(`${msg} (major change: migrate or re-tag)`);
      else warnings.push(msg);
    }

    return { errors, warnings, record: errors.length ? null : t };
  };
}

export type Validator = ReturnType<typeof makeValidator>;
export type { StoryTags };
