// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { guestsFromDescription } from './build-catalog.ts';

describe('guestsFromDescription', () => {
  it('finds a single guest', () => {
    expect(
      guestsFromDescription(
        "In Part Two, Robert is joined again by Daniel O'Brien to continue discussing Jeffrey Epstein.",
      ),
    ).toEqual(["Daniel O'Brien"]);
  });
  it('finds several guests', () => {
    expect(
      guestsFromDescription('Robert is joined by Ify Nwadiwe and Margaret Killjoy to discuss X.'),
    ).toEqual(['Ify Nwadiwe', 'Margaret Killjoy']);
  });
  it('returns nothing without a guest phrase', () => {
    expect(guestsFromDescription("All of this week's episodes put together.")).toEqual([]);
  });
});
