import { useEffect } from 'react';
import { isTyping, shortcutFor } from './shortcuts';

/** "/" focuses the story search; "j" / "k" move focus through the result links. */
export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const shortcut = shortcutFor({
        key: e.key,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        altKey: e.altKey,
        typing: isTyping(e.target),
        dialogOpen: document.querySelector('dialog[open]') !== null,
      });
      if (!shortcut) return;
      if (shortcut === 'search') {
        const box = document.getElementById('story-search');
        if (!box) return;
        e.preventDefault();
        box.focus();
        return;
      }
      const links = [...document.querySelectorAll<HTMLAnchorElement>('.results a.result')];
      if (links.length === 0) return;
      e.preventDefault();
      const at = links.indexOf(document.activeElement as HTMLAnchorElement);
      const next =
        shortcut === 'next'
          ? links[at < 0 ? 0 : Math.min(at + 1, links.length - 1)]
          : links[at < 0 ? 0 : Math.max(at - 1, 0)];
      // focus() also scrolls the result into view.
      next?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}
