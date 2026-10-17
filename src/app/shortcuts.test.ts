import { shortcutFor, type KeyInput } from './shortcuts';

const key = (k: string, over: Partial<KeyInput> = {}): KeyInput => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  typing: false,
  dialogOpen: false,
  ...over,
});

describe('keyboard shortcuts', () => {
  it('maps / to search and j / k to the next and previous result', () => {
    expect(shortcutFor(key('/'))).toBe('search');
    expect(shortcutFor(key('j'))).toBe('next');
    expect(shortcutFor(key('k'))).toBe('previous');
    expect(shortcutFor(key('x'))).toBeNull();
  });

  it('stays out of the way while typing, in a dialog, or with a modifier', () => {
    expect(shortcutFor(key('j', { typing: true }))).toBeNull();
    expect(shortcutFor(key('/', { dialogOpen: true }))).toBeNull();
    expect(shortcutFor(key('k', { ctrlKey: true }))).toBeNull();
    expect(shortcutFor(key('/', { metaKey: true }))).toBeNull();
    expect(shortcutFor(key('j', { altKey: true }))).toBeNull();
  });
});
