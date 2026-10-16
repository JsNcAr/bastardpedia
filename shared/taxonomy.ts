/**
 * Parses the taxonomy YAML (tagging/taxonomy/*.yaml) into typed vocabularies.
 *
 * Pure: it takes file contents, not paths, so it runs in Node and the browser alike.
 * The Node loader that reads the files is pipeline/lib/taxonomy.ts.
 */
import { parse } from 'yaml';
import { z } from 'zod';
import type { Vocabularies } from './schemas/story-tags.ts';

export const TAXONOMY_FILES = [
  'formats.yaml',
  'subject-kinds.yaml',
  'roles.yaml',
  'themes.yaml',
  'polities.yaml',
  'eras.yaml',
  'content-warnings.yaml',
] as const;
export type TaxonomyFile = (typeof TAXONOMY_FILES)[number];

const stringList = z.array(z.string()).optional();

const TermYaml = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'ids are kebab-case'),
  label: z.string(),
  definition: z.string(),
  examples: stringList,
  include_when: stringList,
  exclude_when: stringList,
  see_also: stringList,
});

const FlatFile = z.object({ facet: z.string(), values: z.array(TermYaml).min(1) });
const GroupedFile = z.object({
  facet: z.string(),
  groups: z
    .array(z.object({ id: z.string(), label: z.string(), values: z.array(TermYaml).min(1) }))
    .min(1),
});
const SubjectKindsFile = FlatFile.extend({ org_types: z.array(TermYaml).min(1) });
const PolitiesFile = z.object({
  facet: z.string(),
  values: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        start: z.number().int(),
        end: z.number().int(),
        modern: z.array(z.string().length(2)),
      }),
    )
    .min(1),
});
const ErasFile = z.object({
  facet: z.string(),
  values: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        start: z.number().int(),
        end: z.number().int().nullable(),
        scope: z.enum(['global', 'regional']),
        region_hint: z.string().optional(),
      }),
    )
    .min(1),
});

export type TermDef = z.infer<typeof TermYaml> & { group?: string };
export type PolityDef = z.infer<typeof PolitiesFile>['values'][number];
export type EraDef = z.infer<typeof ErasFile>['values'][number];

export interface Taxonomy {
  version: string;
  formats: TermDef[];
  subjectKinds: TermDef[];
  orgTypes: TermDef[];
  roles: TermDef[];
  themes: TermDef[];
  polities: PolityDef[];
  eras: EraDef[];
  contentWarnings: TermDef[];
  /** Raw YAML by file name, for rendering into tagging packets. */
  sources: Record<TaxonomyFile, string>;
}

function flattenGroups(file: z.infer<typeof GroupedFile>): TermDef[] {
  return file.groups.flatMap((g) => g.values.map((v) => ({ ...v, group: g.label })));
}

function assertUnique(name: string, ids: string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`taxonomy ${name}: duplicate id "${id}"`);
    seen.add(id);
  }
}

export function parseTaxonomy(version: string, sources: Record<TaxonomyFile, string>): Taxonomy {
  const load = <T extends z.ZodType>(file: TaxonomyFile, schema: T): z.infer<T> => {
    const result = schema.safeParse(parse(sources[file]));
    if (!result.success) throw new Error(`taxonomy ${file}: ${z.prettifyError(result.error)}`);
    return result.data;
  };
  const subjectKinds = load('subject-kinds.yaml', SubjectKindsFile);
  const taxonomy: Taxonomy = {
    version: version.trim(),
    formats: load('formats.yaml', FlatFile).values,
    subjectKinds: subjectKinds.values,
    orgTypes: subjectKinds.org_types,
    roles: flattenGroups(load('roles.yaml', GroupedFile)),
    themes: flattenGroups(load('themes.yaml', GroupedFile)),
    polities: load('polities.yaml', PolitiesFile).values,
    eras: load('eras.yaml', ErasFile).values,
    contentWarnings: load('content-warnings.yaml', FlatFile).values,
    sources,
  };
  if (!/^\d+\.\d+\.\d+$/.test(taxonomy.version))
    throw new Error(`taxonomy VERSION is not semver: ${taxonomy.version}`);
  for (const key of [
    'formats',
    'subjectKinds',
    'orgTypes',
    'roles',
    'themes',
    'polities',
    'eras',
    'contentWarnings',
  ] as const) {
    assertUnique(
      key,
      taxonomy[key].map((t) => t.id),
    );
  }
  // see_also must point at ids in the same vocabulary.
  for (const key of ['roles', 'themes'] as const) {
    const ids = new Set(taxonomy[key].map((t) => t.id));
    for (const t of taxonomy[key]) {
      for (const ref of t.see_also ?? []) {
        if (!ids.has(ref))
          throw new Error(`taxonomy ${key}: "${t.id}" has see_also "${ref}", which does not exist`);
      }
    }
  }
  return taxonomy;
}

function ids(list: { id: string }[], name: string): readonly [string, ...string[]] {
  const [first, ...rest] = list.map((t) => t.id);
  if (first === undefined) throw new Error(`taxonomy ${name} is empty`);
  return [first, ...rest];
}

/** The id lists the StoryTags schema is built from. */
export function vocabularies(t: Taxonomy): Vocabularies {
  return {
    formats: ids(t.formats, 'formats'),
    subjectKinds: ids(t.subjectKinds, 'subjectKinds'),
    orgTypes: ids(t.orgTypes, 'orgTypes'),
    roles: ids(t.roles, 'roles'),
    themes: ids(t.themes, 'themes'),
    polities: ids(t.polities, 'polities'),
    contentWarnings: ids(t.contentWarnings, 'contentWarnings'),
  };
}
