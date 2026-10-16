import { useSyncExternalStore } from 'react';

/** Matches the wide three-pane layout breakpoint in src/styles/layout.css (68.75rem = 1100px). */
export const WIDE_QUERY = '(min-width: 68.75rem)';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => true,
  );
}
