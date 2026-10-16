import type { Catalog } from '@shared/schemas/catalog.ts';
import { centuryLabel } from './format';
import type { Facet } from './filter-model';

/** Human labels for every facet value, built once per catalog. */
export interface Labels {
  of(facet: Facet, value: string): string;
  warning(id: string): string;
  polity(id: string): string;
  subjectKind(id: string): string;
  orgType(id: string): string;
}

export function createLabels(catalog: Catalog): Labels {
  const map = (terms: { id: string; label: string }[]) =>
    new Map(terms.map((t) => [t.id, t.label]));
  const tables: Record<Exclude<Facet, 'century' | 'continent'>, Map<string, string>> = {
    format: map(catalog.vocab.formats),
    theme: map(catalog.vocab.themes),
    role: map(catalog.vocab.roles),
    era: new Map(
      catalog.eras.map((e) => [e.id, e.region_hint ? `${e.label} (${e.region_hint})` : e.label]),
    ),
    country: new Map(catalog.countries.map((c) => [c.code, c.name])),
  };
  const warnings = map(catalog.vocab.content_warnings);
  const polities = map(catalog.vocab.polities);
  const kinds = map(catalog.vocab.subject_kinds);
  const orgTypes = map(catalog.vocab.org_types);
  return {
    of(facet, value) {
      if (facet === 'century') return centuryLabel(Number(value));
      if (facet === 'continent') return value;
      return tables[facet].get(value) ?? value;
    },
    warning: (id) => warnings.get(id) ?? id,
    polity: (id) => polities.get(id) ?? id,
    subjectKind: (id) => kinds.get(id) ?? id,
    orgType: (id) => orgTypes.get(id) ?? id,
  };
}
