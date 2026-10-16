// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { deepMerge } from './merge.ts';

describe('deepMerge', () => {
  it('merges objects, replaces arrays and scalars', () => {
    const base = {
      themes: { primary: 'a', secondary: ['b', 'c'] },
      roles: ['x'],
      format: 'deep-dive',
    };
    const patch = { themes: { secondary: ['d'] }, format: 'hero' };
    expect(deepMerge(base, patch)).toEqual({
      themes: { primary: 'a', secondary: ['d'] },
      roles: ['x'],
      format: 'hero',
    });
  });
});
