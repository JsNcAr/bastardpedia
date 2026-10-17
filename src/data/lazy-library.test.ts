import { createLazyLibrary } from './lazy-library';
import { emptyEntry } from './library-model';

describe('lazy library', () => {
  it('loads the Dexie repository on first use and delegates to it', async () => {
    const repo = createLazyLibrary('lazy-library-test');
    await repo.put({ ...emptyEntry('a'), status: 'want' });
    expect((await repo.get('a'))?.status).toBe('want');
    expect((await repo.list()).map((e) => e.id)).toEqual(['a']);
    await repo.remove('a');
    expect(await repo.get('a')).toBeNull();
    expect(await repo.merge([{ ...emptyEntry('b'), status: 'listened' }])).toBe(1);
    const snapshot = await repo.setStatusMany(['c'], 'listened');
    expect((await repo.get('c'))?.status).toBe('listened');
    await repo.restore(snapshot);
    expect(await repo.get('c')).toBeNull();
  });
});
