# Taxonomy

How stories are classified, and why. The vocabularies themselves live in
[`tagging/taxonomy/`](../tagging/taxonomy/) and are the single source of truth. The agent
instructions are in [`tagging/PROMPT.md`](../tagging/PROMPT.md), and the record structure is in
[`shared/schemas/story-tags.ts`](../shared/schemas/story-tags.ts).

Current version: see `tagging/taxonomy/VERSION` (0.2.0, draft).

## The unit: a story, not an episode

Most subjects run over two to seven parts, and early series often retitle every part
("Part One: Alex Jones: The Godfather of Fake News" / "Part Two: How Alex Jones Got Rich…").
`pipeline/group.ts` joins the parts into **stories** (454 BtB stories as of 2026-10-16), and
each story gets one tag record. Reruns ("CZM Rewind") point to their original story and are
never tagged on their own.

## Facets

Each facet answers one question. The facets are designed not to overlap, so a filter on one
never duplicates another.

| Facet                 | Question                                  | Filled by   | Vocabulary                                        |
| --------------------- | ----------------------------------------- | ----------- | ------------------------------------------------- |
| `format`              | What kind of episode?                     | agent       | `formats.yaml`: 7 values                          |
| `subjects`            | Who or what is it about?                  | agent       | free names + `subject-kinds.yaml`                 |
| `roles`               | What were the people?                     | agent       | `roles.yaml`: 32 roles in 7 groups                |
| `themes`              | What is the story about?                  | agent       | `themes.yaml`: 42 themes in 7 groups              |
| `regions`             | Where are they from, where did it happen? | agent       | ISO 3166-1/-2 + `polities.yaml`                   |
| `time`                | When did the main events happen?          | agent       | integer years                                     |
| continent / subregion | Where, broadly?                           | **derived** | UN M49 table                                      |
| periods               | Which period?                             | **derived** | `eras.yaml`: 37 time windows + computed centuries |

### Roles vs themes

These two are the core of topical filtering, and keeping them apart is deliberate:

- A **role** is what a person _was_: `explorer-adventurer`, `cult-leader`, `physician-surgeon`.
- A **theme** is what the story is _about_: `colonialism-imperialism`, `cults-new-religions`,
  `medical-malpractice`.

"Explorers" in the example query is a role. Stories about exploration as an enterprise also
carry the theme `science-exploration`. The UI can offer both ("people who were explorers" /
"stories about exploration"), and they mostly agree.

Organizations don't have roles. Their `org_type` (company, police, cult, intelligence…) plays
that part.

### Regions: origin vs setting

`origin` is where the primary subjects come from, and `setting` is where the story happens.
Splitting them makes queries like "Europeans who did terrible things in South America" possible.

- Fawcett: origin `GB`, setting `BR, BO`.
- Schliemann: origin `DE`, setting `TR, GR, RU, US`.

**Everything maps to modern ISO country codes**, including historical places
(Prussia → `DE`, Ceylon → `LK`, Rhodesia → `ZW`). Borders change and ISO codes don't, which
keeps filtering simple. When the historical state matters, `polities` records it on top:
`british-empire`, `soviet-union`, `confederate-states`, and so on.

Continents and subregions are looked up from the country codes (UN M49), never chosen by the
agent, so "Africa" or "South America" filters are always consistent.

### Time: orientative periods

Era names aren't tags. A story stores years, and **periods are time windows**. A story belongs
to a period when its `main_span` overlaps the window. Period filters are meant to point you in
the right direction, not to draw exact lines. There are three kinds:

- **Centuries**, computed from the years with no list involved: "19th century",
  "1st century BCE". A story spanning 1890–1910 is in both the 19th and the 20th century.
- **Broad periods** (`eras.yaml`, `scope: global`): Ancient world, Middle Ages, Early modern,
  Modern, Long 19th century, Cold War…
- **Named eras** (`eras.yaml`, `scope: regional`): Victorian, Gilded Age, Weimar, Meiji…

Matching uses **`time.main_span` only**. Test for picking it: _if you wrote a two-sentence
encyclopedia summary of why this subject matters, which years would it cover?_ Birth and
childhood are left out unless they are central.

`subjects[].lifespan` (birth and death) is stored for display on the story page. It's never
used for matching.

Example: Percy Fawcett's main events run 1906–1925, so he falls outside "Victorian" (1837–1901)
and appears under "Edwardian", "Interwar" and "20th century". That's fine, because these
filters are orientative. Schliemann (≈1846–1890) and Stanley (≈1867–1890) are Victorian.

`current-affairs` episodes get periods like any other story, usually "Contemporary" and
"21st century".

Named eras filter by time only. `region_hint` (e.g. "UK" for Victorian) is a label that groups
regional eras in the picker. It doesn't restrict matches, so "Victorian" also finds a German
digging in Turkey in the 1870s, which matches how people use the word.

## Format

`format` separates the normal researched stories (`deep-dive`) from:

- current-affairs updates
- book and show readings (`media-reading`)
- Christmas `hero` episodes
- `live-show` episodes
- `crossover` promos
- `meta` Q&As

The app can hide the non-deep-dive formats by default. Precedence when several apply:
`live-show > media-reading > hero > crossover > meta > current-affairs > deep-dive`.

## Strictness: how agents are kept on the rails

1. **Closed vocabularies.** Every id comes from the YAML. The schema rejects unknown ids.
2. **Definitions with boundaries.** Every tag has a definition, examples and, where tags get
   confused, `exclude_when` / `see_also` rules (nazism vs fascism-far-right, malpractice vs
   quackery, cults vs organized religion…).
3. **A fixed procedure.** `PROMPT.md` makes the agent decide format → subjects → roles →
   themes → regions → time → summary, in that order, with tie-break rules for each step.
4. **Limits.** At most 5 subjects, 3 roles, 1 + 4 themes, 6 settings, 6 content warnings
   and 10 keywords. Caps
   force the agent to choose, which keeps filters meaningful.
5. **Confidence and evidence.** Each facet carries a confidence, and non-obvious choices cite
   transcript timestamps. Low-confidence records go to the review queue first.
6. **Validation.** `npm run tags:validate` checks:
   - the schema;
   - the cross-field rules (a primary person needs a role, a setting is required unless online,
     start ≤ end, no duplicates);
   - that every ISO code is real.

   `npm run tags:verify-wikidata` checks every QID against its label.

7. **Human overrides.** Corrections go in `data/overrides/<story-id>.json` and are merged at
   build time, so re-tagging never undoes a human fix.

## Changing the taxonomy

The taxonomy is semver-versioned in `tagging/taxonomy/VERSION`, and every tag record stores the
version it was made with.

| Change                               | Bump  | What else                                                                                                 |
| ------------------------------------ | ----- | --------------------------------------------------------------------------------------------------------- |
| Add a tag, era or polity             | minor | Re-tag stories likely to use it (search keywords), optional                                               |
| Clarify a definition                 | patch | Nothing                                                                                                   |
| Rename, merge, split or remove a tag | major | `tagging/taxonomy/migrations/<version>.yaml` maps old ids to new; `npm run tags:migrate` rewrites records |

Vocabulary gaps reported in agents' `notes` are the main input for minor versions.

## Content warnings

An optional facet (`content-warnings.yaml`, 0–6 per story). A warning applies only when the story
**describes the thing in detail**. A passing mention doesn't count. Since every BtB story involves
terrible people, a warning marks unusually graphic material, not just the topic. The app shows
the warnings on the story page and can hide stories that carry chosen warnings.

## Decisions log

- 2026-10-16: time matching uses `main_span` only. Period filters are orientative, so there's
  no lifetime toggle.
- 2026-10-16: `current-affairs` episodes appear in period searches.
- 2026-10-16: content warnings added as an optional facet.
- 2026-10-16 (0.2.0): `diplomat-official` and `elected-politician` merged into `politician-official`;
  `sports` and `education` themes added; `sexual-abuse` limited to adult victims, `child-abuse`
  covers all abuse of minors (both apply when victims include adults and minors);
  `wellness-self-help` stays separate from `quackery-pseudoscience`.

## Open questions

None at the moment. Vocabulary gaps reported by the pilot tagging will reopen this section.
