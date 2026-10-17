/**
 * Marks the words a search matched. Terms come from the search index, lower case;
 * a match must start at a word boundary, case-insensitively.
 */
export function highlightParts(
  text: string,
  terms: readonly string[],
): (string | { hit: string })[] {
  const words = [...new Set(terms.filter((t) => t.length > 0))].sort((a, b) => b.length - a.length);
  if (words.length === 0) return [text];
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(${escaped.join('|')})`, 'giu');
  const out: (string | { hit: string })[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const at = m.index;
    if (at > last) out.push(text.slice(last, at));
    out.push({ hit: m[0] });
    last = at + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
