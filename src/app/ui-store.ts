import { create } from 'zustand';

/**
 * UI-only state. Data lives in TanStack Query, filters live in the URL; this
 * holds what is neither: the filter drawer on narrow screens and the theme.
 */
export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_KEY = 'theme';

function readTheme(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

interface UiState {
  theme: ThemePreference;
  setTheme: (t: ThemePreference) => void;
  filtersOpen: boolean;
  setFiltersOpen: (open: boolean) => void;
}

export const useUi = create<UiState>((set) => ({
  theme: readTheme(),
  setTheme: (theme) => {
    try {
      if (theme === 'system') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Storage can be blocked; the choice still applies for this visit.
    }
    applyTheme(theme);
    set({ theme });
  },
  filtersOpen: false,
  setFiltersOpen: (filtersOpen) => set({ filtersOpen }),
}));
