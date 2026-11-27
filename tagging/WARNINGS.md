# Re-checking strict content warnings

Instructions for re-checking one story's **strict** content warnings (taxonomy 0.8.0 and
later): sexual violence, child sexual abuse, child abuse, suicide and self-harm, and animal
cruelty. Every other part of the tag record stays as it is. The full tagging rules are in
`tagging/PROMPT.md`, step 8; this is the same rule applied with a smaller packet.

## Input

`npm run tags:warnings-packet -- <story-id>` writes `data/packets/warnings/<story-id>.md`:

- the parts and their descriptions;
- the story's current summary, themes and warnings;
- the strict warnings' definitions;
- for each strict warning, every paragraph of the full transcripts that matches its scan
  words, with about 260 characters either side, and the runs of nearby candidates (a run that
  spans several minutes usually means the story spends real time on it).

## Decide each strict warning

For each of the five, pick one:

- **Detailed** (`detailed`): the story spends real time on it: several minutes of discussion,
  or a vivid or explicit account, even a short one.
- **Mentioned** (`mentions`): any real mention by the hosts that is not detailed, however
  brief: a passing reference, an aside, a comparison, a joke, or a figurative use of the word.
  When in doubt between mentioned and nothing, choose mentioned: people use these to avoid
  hearing the topic at all.
- **Nothing**: no candidate survives the check.

Drop a candidate when it is:

- an ad read or a promo for another show (ads interrupt the story, often with a different
  voice, and talk about products, other podcasts or "this episode is brought to you by");
- the word in another sense: a dogfight between planes, grooming a horse, a pedometer, a
  "molest" that is clearly a transcription error;
- a different warning: put it under the warning it belongs to instead (molestation of a child
  is `child-sexual-abuse`, not `sexual-violence`).

Child sexual abuse is `child-sexual-abuse`; `child-abuse` is physical and emotional abuse,
cruelty and neglect of children. Before 0.8.0 `child-abuse` covered both, so a current
`child-abuse` warning may need to become `child-sexual-abuse`, or both.

A strict warning the story already has stays, at least as a mention: the original tagger read
the whole transcript, and this packet only shows the scan's words. You may move it from
detailed to mentioned when the candidates show it is brief. The merge step enforces this (the
one exception: an old `child-abuse` warning that was really sexual abuse may become
`child-sexual-abuse`).

The scan only knows its words. If the descriptions or the current tags make another kind of
mention likely (the summary names an abuser, a theme is `sexual-abuse` or `child-abuse`), say so
in `notes` rather than guessing.

## Output

Write `data/review/warnings/<story-id>.json`:

```json
{
  "story_id": "<story-id>",
  "detailed": ["child-sexual-abuse"],
  "mentions": ["sexual-violence", "suicide-self-harm"],
  "evidence": [
    {
      "facet": "content_warnings",
      "part": 1,
      "at": "00:41:10",
      "note": "Long account of the abuse of boys at the school"
    },
    {
      "facet": "content_mentions",
      "part": 2,
      "at": "00:12:03",
      "note": "Host jokes about a suicide pact"
    }
  ],
  "notes": "Optional, at most 400 characters, for the reviewer."
}
```

- Only strict warning ids, each in one list at most.
- `evidence`: up to 6 entries, at least one per warning you list when the story has a
  transcript. Timestamps come from the candidates or the transcript; never invent one (a part
  without a transcript gets no evidence). Notes are at most 120 characters, **in your own words, never quotations** from the
  transcript (ADR 0007).
- Empty lists are fine: `"detailed": [], "mentions": []` records that the story was checked and
  has none.
