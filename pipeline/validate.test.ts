// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadTaxonomy } from './lib/taxonomy.ts';
import { makeValidator } from './lib/validate.ts';

const ID = 'percy-fawcett-real-life-indiana-jones-or-deluded-psychic-racist';
const taxonomy = loadTaxonomy();
const validate = makeValidator({
  taxonomy,
  episodeStoryIds: new Set([ID]),
  releaseYears: new Map([[ID, 2026]]),
});

type Rec = Record<string, unknown> & {
  themes: { primary: string; secondary: string[] };
  regions: { origin: string[]; setting: string[]; subdivisions: string[] };
  time: {
    main_span: { start: number; end: number | null };
    covered_span: { start: number; end: number };
    partial_life?: boolean;
  };
  roles: string[];
  taxonomy_version: string;
};

function fixture(): Rec {
  const rec = JSON.parse(
    readFileSync(join(import.meta.dirname, 'fixtures', 'valid.json'), 'utf8'),
  ) as Rec;
  rec.taxonomy_version = taxonomy.version;
  return rec;
}

const errorsOf = (rec: unknown, id = ID) => validate(rec, id).errors.join('\n');

describe('validate-tags', () => {
  it('accepts the valid fixture', () => {
    expect(validate(fixture(), ID)).toMatchObject({ errors: [], warnings: [] });
  });

  it('rejects an unknown theme id', () => {
    const rec = fixture();
    rec.themes.primary = 'explorers';
    expect(errorsOf(rec)).toMatch(/themes\.primary/);
  });

  it('rejects a country code that does not exist', () => {
    const rec = fixture();
    rec.regions.setting = ['BR', 'XX'];
    expect(errorsOf(rec)).toMatch(/"XX" is not an ISO 3166-1 country code/);
  });

  it('rejects a subdivision of an unknown country', () => {
    const rec = fixture();
    rec.regions.subdivisions = ['QQ-AB'];
    expect(errorsOf(rec)).toMatch(/does not start with a real country code/);
  });

  it('rejects a span that ends before it starts', () => {
    const rec = fixture();
    rec.time.main_span = { start: 1925, end: 1906 };
    expect(errorsOf(rec)).toMatch(/start must be <= end/);
  });

  it('rejects a primary person without a role', () => {
    const rec = fixture();
    rec.roles = [];
    expect(errorsOf(rec)).toMatch(/needs at least one role/);
  });

  it('rejects a record whose story id does not match its file', () => {
    expect(errorsOf(fixture(), 'some-other-story')).toMatch(/does not match the file name/);
  });

  it('counts an older minor taxonomy version without warning, and fails on another major', () => {
    const minor = fixture();
    minor.taxonomy_version = '0.0.1';
    expect(validate(minor, ID).warnings).toEqual([]);
    expect(validate(minor, ID).olderVersion).toBe(true);
    const newer = fixture();
    newer.taxonomy_version = '0.99.0';
    expect(validate(newer, ID).warnings.join()).toMatch(/newer than the taxonomy/);
    const major = fixture();
    major.taxonomy_version = '9.0.0';
    expect(errorsOf(major)).toMatch(/major change/);
  });

  it("rejects covered years that miss the protagonist's lifetime", () => {
    const rec = fixture();
    rec.time.covered_span = { start: 1906, end: 1925 };
    expect(validate(rec, ID).errors.join(' ')).toContain('birth (1867)');
  });

  it('lifts the lifetime rule for a story framed around part of a life', () => {
    const rec = fixture();
    rec.time.covered_span = { start: 1906, end: 1925 };
    rec.time.partial_life = true;
    expect(validate(rec, ID).errors).toEqual([]);
  });

  it('rejects covered years that do not contain the main years', () => {
    const rec = fixture();
    rec.time.covered_span = { start: 1867, end: 1920 };
    expect(validate(rec, ID).errors.join(' ')).toContain('covered_span must contain main_span');
  });
});
