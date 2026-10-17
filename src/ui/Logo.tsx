import { LOGO_BOOK, LOGO_HALO, LOGO_TAIL } from './logo-paths';

/**
 * The symbol: volume B with a horn, a slipped halo and a devil's-tail bookmark.
 * Colours come from the brand tokens through CSS (src/styles/layout.css), so it
 * follows the theme. Decorative: the brand link next to it carries the name.
 */
export function Logo() {
  return (
    <svg className="logo" viewBox="0 0 256 256" aria-hidden="true" focusable="false">
      <path className="logo-mark" fillRule="evenodd" d={LOGO_BOOK} />
      <path className="logo-halo" fillRule="evenodd" d={LOGO_HALO} />
      <path className="logo-mark" d={LOGO_TAIL} />
    </svg>
  );
}
