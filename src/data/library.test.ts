import { createLibraryRepository, emptyEntry, isBlank } from './library';

let n = 0;
const repo = () => createLibraryRepository(`test-library-${String(++n)}`);

describe('library repository', () => {
  it('puts, gets and lists entries', async () => {
    const r = repo();
    await r.put({ ...emptyEntry('a'), status: 'want' });
    await r.put({ ...emptyEntry('b'), favourite: true });
    expect((await r.get('a'))?.status).toBe('want');
    expect((await r.list()).map((e) => e.id).sort()).toEqual(['a', 'b']);
  });

  it('keeps createdAt and moves updatedAt on upsert', async () => {
    const r = repo();
    const first = await r.put({ ...emptyEntry('a', '2020-01-01T00:00:00.000Z'), status: 'want' });
    const second = await r.put({ ...first, status: 'listened', createdAt: '2030-01-01T00:00:00.000Z' });
    expect(second.createdAt).toBe('2020-01-01T00:00:00.000Z');
    expect(second.updatedAt >= first.updatedAt).toBe(true);
    expect(second.status).toBe('listened');
  });

  it('soft-deletes: hidden from list and get, visible to changedSince', async () => {
    const r = repo();
    await r.put({ ...emptyEntry('a'), note: 'listen with headphones' });
    await r.remove('a');
    expect(await r.get('a')).toBeNull();
    expect(await r.list()).toEqual([]);
    const changed = await r.changedSince('1970-01-01T00:00:00.000Z');
    expect(changed).toHaveLength(1);
    expect(changed[0]?.deletedAt).not.toBeNull();
  });

  it('removing a missing entry is a no-op', async () => {
    await expect(repo().remove('nope')).resolves.toBeUndefined();
  });

  it('knows a blank entry', () => {
    expect(isBlank(emptyEntry('a'))).toBe(true);
    expect(isBlank({ ...emptyEntry('a'), note: '  ' })).toBe(true);
    expect(isBlank({ ...emptyEntry('a'), favourite: true })).toBe(false);
  });

  it('merges by updatedAt: newer records win, older ones and ties are skipped', async () => {
    const r = repo();
    const at = (iso: string) => ({ createdAt: iso, updatedAt: iso });
    await r.merge([{ ...emptyEntry('a'), ...at('2026-01-02T00:00:00.000Z'), note: 'local' }]);
    const written = await r.merge([
      { ...emptyEntry('a'), ...at('2026-01-01T00:00:00.000Z'), note: 'older' },
      { ...emptyEntry('b'), ...at('2026-01-01T00:00:00.000Z'), status: 'want' },
      {
        ...emptyEntry('c'),
        ...at('2026-01-03T00:00:00.000Z'),
        deletedAt: '2026-01-03T00:00:00.000Z',
      },
    ]);
    expect(written).toBe(2);
    expect((await r.get('a'))?.note).toBe('local');
    expect((await r.get('b'))?.updatedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(await r.get('c')).toBeNull();
  });

  it('sets one status on many stories, keeping favourites and notes', async () => {
    const r = repo();
    await r.put({ ...emptyEntry('want'), status: 'want', note: 'queued' });
    await r.put({ ...emptyEntry('fav'), favourite: true });
    const snapshot = await r.setStatusMany(['want', 'fav', 'new'], 'listened');
    const all = new Map((await r.list()).map((e) => [e.id, e]));
    expect([...all.values()].map((e) => e.status)).toEqual(['listened', 'listened', 'listened']);
    expect(all.get('want')?.note).toBe('queued');
    expect(all.get('fav')?.favourite).toBe(true);
    expect(snapshot.map((s) => [s.id, s.before?.status ?? null])).toEqual([
      ['want', 'want'],
      ['fav', null],
      ['new', null],
    ]);
    expect(snapshot[2]?.before).toBeNull();
  });

  it('clearing a status tombstones entries left blank', async () => {
    const r = repo();
    await r.put({ ...emptyEntry('plain'), status: 'listened' });
    await r.put({ ...emptyEntry('noted'), status: 'listened', note: 'great' });
    await r.setStatusMany(['plain', 'noted', 'missing'], null);
    expect(await r.get('plain')).toBeNull();
    expect((await r.get('noted'))?.status).toBeNull();
    expect(await r.get('missing')).toBeNull();
  });

  it('restores exactly what a bulk write replaced', async () => {
    const r = repo();
    await r.put({ ...emptyEntry('want'), status: 'want', note: 'queued' });
    const before = await r.list();
    const snapshot = await r.setStatusMany(['want', 'new'], 'listened');
    await r.restore(snapshot);
    const after = await r.list();
    expect(after.map(({ id, status, note, favourite }) => ({ id, status, note, favourite }))).toEqual(
      before.map(({ id, status, note, favourite }) => ({ id, status, note, favourite })),
    );
    expect(await r.get('new')).toBeNull();
  });
});
