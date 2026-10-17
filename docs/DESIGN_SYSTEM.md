# Design system

## Direction

An archival reference work about history's worst people. Warm paper and ink
neutrals carry the page. One oxblood accent marks what matters: the selected
story, the primary action, links. Headings are set in Source Serif 4, and the
interface in Inter. Both fonts are self-hosted through `@fontsource-variable`.

## Tokens

`design-tokens.json` (DTCG) is the single source of every colour, size, radius,
shadow and duration. `npm run tokens` (`scripts/build_theme.mjs` →
`scripts/build_tokens.mjs`, the builder copied from ChronoTeach) generates
`src/styles/theme-tokens.css`. That file is gitignored and must never be edited.

| Group                                                      | Contents                                                                                                                   |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `primitive`                                                | `paper` 50–975 and `oxblood` 50–900 scales, `white`. Never referenced from CSS directly                                    |
| `semantic`                                                 | `text`, `surface`, `border`, `accent`, `action` by purpose. Emitted as `--color-*`                                         |
| `dark`                                                     | Overrides of the semantic tier for dark mode                                                                               |
| `font`, `space`, `radius`, `shadow`, `motion`, `size`, `z` | Emitted as `--font-*`, `--text-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--duration-*`/`--ease-*`, `--size-*`, `--z-*` |

Rules:

- CSS uses semantic variables only, never a raw value or a primitive.
- Contrast is measured, not assumed. Text pairs are at least 4.5:1 and the
  focus ring at least 3:1, in light and dark. Remeasure after changing a colour.

## Themes

Light and dark come from the same tokens. With no choice made, the operating
system decides (`prefers-color-scheme`). An explicit choice sets
`data-theme="light|dark"` on `<html>` and is remembered in `localStorage`
(wrapped in try/catch). The theme switch is in the header on wide screens and in
the footer on phones.

## Layout: desktop first, collapsing down

| Width                             | Layout                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------- |
| ≥ 68.75rem (1100 px, `size.wide`) | Three panes: facet sidebar · results · story detail (when `/stories/:id`)       |
| 48rem – 68.75rem                  | Results with the story as its own page. Facets in a drawer                      |
| < 48rem                           | Single column. Facets in a native `<dialog>` drawer, theme switch in the footer |

Breakpoints can't read custom properties, so 48rem and 68.75rem are written in
`src/styles/layout.css` and mirrored in `src/app/useMediaQuery.ts`. Change all
three places together.

## CSS organisation

One file per component in `src/styles/`, imported in order by
`src/styles/index.css`: tokens, base (reset and type), layout, then
components (button, segmented, search, facet, chip, results, timeline, story,
callout, form, state, drawer, library, prose).

- **No inline `style` attributes.** ESLint rejects JSX `style=`, and the CSP has
  no `unsafe-inline`. The icon sprite is hidden with a class for the same reason.
- No CSS framework (ADR 0008 in ChronoTeach, carried over).

## Logo

The logo kit lives in `brand/`. The full guidelines are in `brand/README.md`.

- **The mark:** volume B with a horn, a slipped halo and a devil's-tail bookmark.
- **In the header:** `src/ui/Logo.tsx` draws it next to the live-text name. Its
  geometry is generated into `src/ui/logo-paths.ts` by
  `brand/tools/build_masters.py`, and a test keeps it in step with
  `brand/masters/symbol.svg`.
- **Colours:** the `brand.mark` and `brand.halo` tokens (oxblood.600 and
  gilt.500, with oxblood.300 and gilt.300 in dark mode), applied through the
  `.logo-mark` and `.logo-halo` classes.
- **Size:** `--size-logo`.
- **Icons:** the favicon and app icons in `public/` are exported from the
  masters.

The halo colour is for graphics only. At 3.36:1 on paper it passes the 3:1
minimum for graphics, but not the 4.5:1 that text needs.

## Icons

lucide icons, with path data taken verbatim from `lucide-react` and built into a
sprite by `scripts/build_icons.mjs` (`src/icons/sprite.generated.ts`,
gitignored). Use `<Icon name="…" />`. To add one, add its name to `ICONS` and
run `npm run icons`.

## Interaction rules

- Everything works by keyboard, with a visible focus ring on every interactive
  element.
- Interactive elements have all their states: default, hover, focus-visible,
  active, disabled, and selected or checked where it applies.
- Facet options show result counts. Options with zero results stay visible but
  muted.
- **Long facet lists start short** (`FacetList`, rules in `facet-list.ts`):
  - **collapsed:** the 5 options with the most stories, plus every selected
    option, so a selection is never hidden;
  - **toggle:** "Show all N" opens the full list with its subheadings;
  - **find box:** lists over 20 options get one when expanded, and it ignores
    case and accents;
  - **short lists:** 7 options or fewer always show whole;
  - **centuries:** a chip grid, newest first.

  Expansion is UI state, never part of the URL.

- Active filters appear as removable chips with a clear-all.
- **Panels, drawers and story views can always be left in one step:**
  - a visible close control that stays in view while the content scrolls;
  - Escape, except while typing;
  - tapping a drawer's backdrop.

  Closing returns focus to where the visitor came from, and a new story opens
  at its top.

- **The year range** is one track with two handles:
  - **the track:** two range inputs overlap; the span between the handles is an
    SVG rectangle, because inline styles are off limits;
  - **the scale:** cubic, so recent centuries get more travel than antiquity;
  - **text fields:** From and To accept negative years or "BCE";
  - **URL:** dragging replaces it, typing a year pushes it;
  - **targets:** the handles are 24 px, the WCAG minimum.
- **Search on phones:** it sits above the results, not inside the filter
  drawer.
- **Search matches** are marked in result titles and summaries with
  `surface.highlight`. Text on it measures 12.9:1 in light mode and 11.3:1 in
  dark.
- **Keyboard shortcuts** (listed on the About page):
  - `/` focuses the search;
  - `j` / `k` move through the results;
  - `Esc` closes the story pane.

  They are off while typing, inside a dialog, or with a modifier key held.

- **The timeline view** (`view=timeline`, `src/features/catalog/timeline/`):
  - **toggle:** List | Timeline in the results tools. Same results, filters,
    story pane and shortcuts; with no sort chosen it orders by period;
  - **density strip:** stories per time bin (about 40 bins) as SVG bars, with a
    text summary for screen readers. Dragging, or clicking a bar, sets the year
    filter on release; the selection is an SVG rectangle while dragging, and
    Escape drops it. Keyboard users have the year slider and fields;
  - **axis:** fits the stories shown. The start leaves out far outliers (below
    the lower quartile by three interquartile ranges), so one prehistoric story
    doesn't squash the rest; a year filter sets both ends and zooms in. The
    axis sticks above the rows, and narrow columns label every other tick;
  - **rows:** one per story on the shared axis, not packed lanes (237 stories
    cover 1980). Years covered are a faint bar, main events a solid one, and a
    small triangle marks an edge the story runs off. The bar is decorative; the
    row's text carries the years;
  - **layout:** a container query on the results column puts the title in a
    `size.timeline-label` column at 40rem and wider, and stacks it above a
    full-width bar below that, beside the story pane too;
  - **no dates:** stories without dates follow under their own heading.
- Agent-only records carry a quiet "Unreviewed" badge: present, never alarming.
- Empty, loading and error states use `StateMessage` with a plain explanation
  and a next step.
- No emoji anywhere.
