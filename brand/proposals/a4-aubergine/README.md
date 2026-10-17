# Proposal A4: episcopal violet and brass

An alternative palette for the logo, kept so it can be adopted later. The
chosen palette is O2, site oxblood with warm gilt (`brand/README.md`). The
geometry is identical, and only the colours change.

| Role                     | O2 (in use) | A4 (this proposal) |
| ------------------------ | ----------- | ------------------ |
| Mark (book, tail), light | `#852D23`   | `#56306A`          |
| Halo, light              | `#B07A1E`   | `#94762E`          |
| Mark, dark mode          | `#D3877A`   | `#C9A9DB`          |
| Halo, dark mode          | `#D9AE52`   | `#D3B25E`          |

Contrast as measured on the site's page colours (`paper.50` light,
`paper.950` dark):

| Pair               | O2     | A4     |
| ------------------ | ------ | ------ |
| Mark on light page | 7.92:1 | 9.37:1 |
| Halo on light page | 3.36:1 | 3.88:1 |
| Mark on dark page  | 6.64:1 | 8.99:1 |
| Halo on dark page  | 8.94:1 | 9.09:1 |

Both pass the 3:1 minimum for graphics. The halo colour is for the mark only,
never for text.

## Why it was not chosen

The mark is a devil wearing a halo. In oxblood the book reads as the devil
and the gold halo as the contradiction. In violet the book reads as
ecclesiastical, so the devil half rests on the horn and tail alone. A4 is the
more distinctive palette: red is the most common primary colour among media
logos, purple among the least. See the decision in `brand/README.md`.

## Files

`masters/` holds every master in A4, light and dark, built by
`python3 brand/tools/build_masters.py --palette a4 --out brand/proposals/a4-aubergine/masters`.

## Adopting it

1. Rebuild the masters in A4 over the O2 ones:
   `python3 brand/tools/build_masters.py --palette a4`. The app's logo
   geometry (`src/ui/logo-paths.ts`) is unaffected, since it carries no
   colour.
2. In `design-tokens.json`, add the violet and brass primitives and point the
   brand tokens at them:
   - `primitive.violet`:
     - `50 #F5F3F6`, `100 #E4DEE7`, `200 #C9A9DB` (hand-tuned for dark mode);
     - `300 #9D87A9`, `400 #785988`, `500 #56306A`;
     - `600 #472757`, `700 #392046`, `800 #2B1835`, `900 #1D1024`.
   - `primitive.brass`:
     - `300 #D3B25E`;
     - `500 #94762E`.
   - Light mode: `semantic.brand.mark` becomes `{primitive.violet.500}` and
     `semantic.brand.halo` becomes `{primitive.brass.500}`.
   - Dark mode: `dark.brand.mark` becomes `{primitive.violet.200}` and
     `dark.brand.halo` becomes `{primitive.brass.300}`.
3. Re-export the icons from the new masters with the tile in `#56306A` (the
   commands are in `brand/README.md`), and copy them into `public/`.
4. Decide separately whether the interface accent (links, selection, primary
   buttons, currently oxblood) follows. That is a wider change: every
   `accent` and `link` token, remeasured in light and dark.
5. Run `npm run tokens` and `npm run verify`, then remeasure the pairs above.
