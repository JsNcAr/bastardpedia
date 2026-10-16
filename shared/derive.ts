/**
 * Fields the catalog derives from tags instead of asking the tagging agent:
 * centuries and eras from years, continents and subregions from country codes.
 * Pure functions; pipeline/build-catalog.ts applies them at build time.
 */
import worldCountries, { type Country as WorldCountry } from 'world-countries';

// world-countries is CommonJS (module.exports = array). Node's ESM interop and
// bundlers hand the array to a default import, but TypeScript's NodeNext mode types
// it as the module namespace, so normalize once.
const WORLD: readonly WorldCountry[] = Array.isArray(worldCountries)
  ? worldCountries
  : (worldCountries as unknown as { default: WorldCountry[] }).default;

export interface Span {
  start: number;
  /** null = still ongoing. */
  end: number | null;
}

export interface EraWindow {
  id: string;
  start: number;
  end: number | null;
}

/** Year -> century number. 1906 -> 20, 1900 -> 19, -149 -> -2, -1 -> -1. There is no year 0. */
export function centuryOf(year: number): number {
  if (year === 0) throw new Error('there is no year 0');
  return year > 0 ? Math.ceil(year / 100) : -Math.ceil(-year / 100);
}

function resolveEnd(span: Span, now: number): number {
  return span.end ?? now;
}

/** Every century a span touches, ascending. 19 = 19th century CE, -1 = 1st century BCE. */
export function centuriesOf(span: Span, now = new Date().getFullYear()): number[] {
  const end = resolveEnd(span, now);
  const from = centuryOf(span.start === 0 ? 1 : span.start);
  const to = centuryOf(end === 0 ? 1 : end);
  const out: number[] = [];
  for (let c = from; c <= to; c++) if (c !== 0) out.push(c);
  return out;
}

/** "19th century", "1st century BCE". */
export function centuryLabel(century: number): string {
  const n = Math.abs(century);
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix} century${century < 0 ? ' BCE' : ''}`;
}

/** Ids of the eras whose window overlaps the span (inclusive), in era order. */
export function erasOf(
  span: Span,
  eras: readonly EraWindow[],
  now = new Date().getFullYear(),
): string[] {
  const end = resolveEnd(span, now);
  return eras.filter((e) => span.start <= (e.end ?? now) && e.start <= end).map((e) => e.id);
}

export interface CountryInfo {
  code: string;
  name: string;
  continent: string;
  subregion: string;
}

const COUNTRIES: ReadonlyMap<string, CountryInfo> = new Map(
  WORLD.map((c) => [
    c.cca2,
    { code: c.cca2, name: c.name.common, continent: c.region, subregion: c.subregion || c.region },
  ]),
);

export function countryInfo(code: string): CountryInfo | undefined {
  return COUNTRIES.get(code);
}

export function isCountryCode(code: string): boolean {
  return COUNTRIES.has(code);
}

/** Distinct continents and subregions of a set of country codes; unknown codes are skipped. */
export function regionsOf(codes: readonly string[]): {
  continents: string[];
  subregions: string[];
} {
  const continents = new Set<string>();
  const subregions = new Set<string>();
  for (const code of codes) {
    const info = COUNTRIES.get(code);
    if (!info) continue;
    continents.add(info.continent);
    subregions.add(info.subregion);
  }
  return { continents: [...continents].sort(), subregions: [...subregions].sort() };
}
