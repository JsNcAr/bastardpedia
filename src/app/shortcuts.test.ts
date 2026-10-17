import { isTyping, shortcutFor, type KeyInput } from './shortcuts';

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

  it('counts text fields as typing, but not checkboxes or radios', () => {
    const field = (html: string) => {
      document.body.innerHTML = html;
      return document.body.firstElementChild;
    };
    expect(isTyping(field('<input type="search">'))).toBe(true);
    expect(isTyping(field('<textarea></textarea>'))).toBe(true);
    expect(isTyping(field('<input type="checkbox">'))).toBe(false);
    expect(isTyping(field('<input type="radio">'))).toBe(false);
    expect(isTyping(field('<a href="/">x</a>'))).toBe(false);
  });
});
