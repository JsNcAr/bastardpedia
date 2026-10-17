import { highlightParts } from './highlight';

/** Renders `text` with the words a search matched wrapped in <mark>. */
export function Highlight({
  text,
  terms,
}: {
  text: string;
  terms?: readonly string[] | undefined;
}) {
  if (!terms || terms.length === 0) return text;
  return highlightParts(text, terms).map((p, i) =>
    typeof p === 'string' ? (
      p
    ) : (
      <mark key={i} className="hit">
        {p.hit}
      </mark>
    ),
  );
}
