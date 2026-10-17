import { grouped, matchesQuery, needsToggle, topOptions, type ListOption } from './facet-list';

const opt = (id: string, count: number, checked = false, group?: string): ListOption => ({
  id,
  label: id,
  count,
  checked,
  group,
});

describe('facet list rules', () => {
  const list = [
    opt('a', 3),
    opt('b', 9),
    opt('c', 1),
    opt('d', 9),
    opt('e', 5),
    opt('f', 2),
    opt('g', 7),
  ];

  it('keeps the options with the most stories, ties in canonical order', () => {
    expect(topOptions(list, 3).map((o) => o.id)).toEqual(['b', 'd', 'g']);
  });

  it('can return the kept options in canonical order', () => {
    expect(topOptions(list, 3, 'canonical').map((o) => o.id)).toEqual(['b', 'd', 'g']);
    expect(topOptions(list, 4, 'canonical').map((o) => o.id)).toEqual(['b', 'd', 'e', 'g']);
  });

  it('never hides a checked option', () => {
    const withPick = list.map((o) => (o.id === 'c' ? { ...o, checked: true } : o));
    expect(topOptions(withPick, 2).map((o) => o.id)).toEqual(['b', 'd', 'c']);
  });

  it('shows short lists whole instead of offering one more', () => {
    expect(needsToggle(7)).toBe(false);
    expect(needsToggle(8)).toBe(true);
    expect(needsToggle(9, 8)).toBe(true);
    expect(needsToggle(8, 8)).toBe(false);
  });

  it('finds labels ignoring case and accents', () => {
    expect(matchesQuery('Côte d’Ivoire', 'cote')).toBe(true);
    expect(matchesQuery('Ceaușescu era', 'CEAUSESCU')).toBe(true);
    expect(matchesQuery('Paraguay', 'peru')).toBe(false);
    expect(matchesQuery('Anything', '  ')).toBe(true);
  });

  it('groups for the full list in first-appearance order', () => {
    const g = grouped([
      opt('x', 1, false, 'Asia'),
      opt('y', 1, false, 'Africa'),
      opt('z', 1, false, 'Asia'),
    ]);
    expect(g.map(([k, v]) => [k, v.map((o) => o.id)])).toEqual([
      ['Asia', ['x', 'z']],
      ['Africa', ['y']],
    ]);
  });
});
