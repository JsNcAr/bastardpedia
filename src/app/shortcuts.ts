/**
 * Catalogue keyboard shortcuts: "/" jumps to the search, "j" and "k" move through
 * the results. They stay out of the way while typing, inside a dialog, and when a
 * modifier key is held (so browser and OS shortcuts keep working).
 */
export type Shortcut = 'search' | 'next' | 'previous';

export interface KeyInput {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  /** True when the event comes from a field or editable content. */
  typing: boolean;
  /** True when a modal dialog (the filter drawer) is open. */
  dialogOpen: boolean;
}

export function shortcutFor(e: KeyInput): Shortcut | null {
  if (e.ctrlKey || e.metaKey || e.altKey || e.typing || e.dialogOpen) return null;
  if (e.key === '/') return 'search';
  if (e.key === 'j') return 'next';
  if (e.key === 'k') return 'previous';
  return null;
}

/** Text entry only: a focused checkbox or radio still lets j and k move on. */
export function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.closest('input:not([type="checkbox"]):not([type="radio"]), textarea, select') !== null)
  );
}
