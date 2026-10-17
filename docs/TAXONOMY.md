# Taxonomy

How stories are classified, and why. The vocabularies themselves live in
[`tagging/taxonomy/`](../tagging/taxonomy/) and are the single source of truth. The agent
instructions are in [`tagging/PROMPT.md`](../tagging/PROMPT.md), and the record structure is in
[`shared/schemas/story-tags.ts`](../shared/schemas/story-tags.ts).

Current version: see `tagging/taxonomy/VERSION` (0.5.0, draft).

## The unit: a story, not an episode

Most subjects run over two to seven parts, and early series often retitle every part
("Part One: Alex Jones: The Godfather of Fake News" / "Part Two: How Alex Jones Got Rich…").
`pipeline/group.ts` joins the parts into **stories** (454 BtB stories as of 2026-10-16), and
each story gets one tag record. Reruns ("CZM Rewind") point to their original story and are
never tagged on their own.

## Facets

Each facet answers one question. The facets are designed not to overlap, so a filter on one
never duplicates another.

| Facet                 | Question                                  | Filled by   | Vocabulary                                                                             |
| --------------------- | ----------------------------------------- | ----------- | -------------------------------------------------------------------------------------- |
| `format`              | What kind of episode?                     | agent       | `formats.yaml`: 7 values                                                               |
| `subjects`            | Who or what is it about?                  | agent       | free names + `subject-kinds.yaml`                                                      |
| `roles`               | What were the people?                     | agent       | `roles.yaml`: 33 roles in 7 groups                                                     |
| `themes`              | What is the story about?                  | agent       | `themes.yaml`: 49 themes in 7 groups                                                   |
| `regions`             | Where are they from, where did it happen? | agent       | ISO 3166-1/-2 + `polities.yaml`                                                        |
| `time`                | When did the main events happen?          | agent       | integer years                                                                          |
| continent / subregion | Where, broadly?                           | **derived** | UN M49 table                                                                           |
| periods               | Which period?                             | **derived** | `eras.yaml`: 37 time windows (regional ones matched by place too) + computed centuries |

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

### Time: covered years and main years

Era names aren't tags. A story stores years, and **periods are time windows**. Period filters
are meant to point you in the right direction, not to draw exact lines. There are three kinds:

- **Centuries**, computed from the years with no list involved: "19th century",
  "1st century BCE". A story spanning 1890–1910 is in both the 19th and the 20th century.
- **Broad periods** (`eras.yaml`, `scope: global`): Ancient world, Middle Ages, Early modern,
  Modern, Long 19th century, Cold War… They match by time only.
- **Named eras** (`eras.yaml`, `scope: regional`): Victorian, Gilded Age, Weimar, Meiji… They
  match by time **and** place (below).

Each story records two spans:

| Span                | What it is                                                                                                                                                                                                                                                                                                                                                 | Used for                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `time.covered_span` | Everything the story covers at real length: part of the subject's own story and a real share of the airtime (a few minutes, roughly 5%, or more). For deep-dive, hero and live-show stories about a person, at least their whole life, up to the release year if they were alive, unless `partial_life` marks a story framed around one period of the life | **All period filters**                                                     |
| `time.main_span`    | The core: the years a two-sentence encyclopedia summary would cover                                                                                                                                                                                                                                                                                        | Chronological sorting, the story page, a possible strict filter mode later |

Epilogues about other people retracing or reinterpreting the subject (modern searches for
Fawcett's lost city) don't extend the covered years. They set `reaches_present`. Consequences the
subject caused do count: the 2018 case about Nestlé's infant-formula marketing is inside
Nestlé's covered years.

| Story               | Main years | Covered years                |
| ------------------- | ---------- | ---------------------------- |
| Heinrich Schliemann | 1868–1890  | 1822–1890                    |
| Percy Fawcett       | 1906–1925  | 1867–1925                    |
| L. Ron Hubbard      | 1934–1975  | 1911–1986                    |
| Henry Kissinger     | 1968–1977  | 1923–2022 (alive at release) |

**Regional eras need the place too.** Each regional era lists in `match` the countries,
continents or polities a story must touch (origin, setting or polities) to belong to it. Meiji
needs Japan, Jim Crow the US, Nazi Germany Germany or Austria (or the polity). Victorian and
Edwardian take Europe or the British Empire, so Schliemann, a German digging in Turkey in the
1870s, is still Victorian, and so is Fawcett through the British Empire.

Known limitation: the place check doesn't know _when_ the story was in each place. Hubbard's
English years in the 1960s put him under "Edwardian" because his covered years start in 1911.
That's accepted, since the filters only orient.

`current-affairs` episodes get periods like any other story, usually "Contemporary" and
"21st century".

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
4. **Limits.** At most 5 subjects, 3 roles, 1 + 8 themes (4–5 suggested), 6 settings, 6 content warnings
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

An optional facet (`content-warnings.yaml`, 0–6 per story). A warning applies when the story
**spends real time** on the thing: several minutes, or a vivid or explicit account. A passing
mention doesn't count. The app shows the warnings on the story page and can hide stories that
carry chosen warnings.

## Decisions log

- 2026-10-16: time matching uses `main_span` only. Period filters are orientative, so there's
  no lifetime toggle.
- 2026-10-16: `current-affairs` episodes appear in period searches.
- 2026-10-16: content warnings added as an optional facet.
- 2026-10-16 (0.2.0): `diplomat-official` and `elected-politician` merged into `politician-official`;
  `sports` and `education` themes added; `sexual-abuse` limited to adult victims, `child-abuse`
  covers all abuse of minors (both apply when victims include adults and minors);
  `wellness-self-help` stays separate from `quackery-pseudoscience`.

- 2026-10-16 (0.3.0): period filters use the new `time.covered_span` (whole life for person
  stories, airtime-weighted, no epilogues) instead of `main_span`; regional eras also match by
  place; content warning `child-death`; themes `immigration-borders`, `diplomacy-foreign-policy`,
  `moral-panics`, `domestic-abuse`, `cultural-heritage-looting`; `racism-white-supremacy` widened
  to all racism and religious bigotry; `weapons-arms-trade` widened to arms races and nuclear
  strategy; setting order is by where the harm happened.

- 2026-10-16 (0.4.0, after the pilot review): up to 8 other themes, 4–5 suggested; theme
  `folklore-legend`; warning `slavery`; warnings apply when the story spends real time on the
  thing, not only for graphic detail; comparisons from other eras don't extend covered years;
  `floruit` for people with unknown dates; role `rescuer-humanitarian`; subject kind
  `ethnic-group`; org type `criminal-org` (party paramilitaries go under military); polities
  Kingdom of France and Kingdom of Italy; the lifetime rule covers live shows;
  `medical-malpractice` includes ableist and gendered medical abuse.

- 2026-10-16 (0.5.0): theme `civil-war`, requested during the pilot review.

- 2026-10-17 (0.6.0, after the full run): `time.partial_life` lifts the lifetime rule for
  stories framed around one period or side of a person's life ("The Childhood of Joseph
  Stalin"), so they are not found under periods the episode never reaches. Records tagged under
  an earlier 0.x version stay valid and are counted, not warned, by `tags:validate`.

- 2026-10-17 (0.7.0, gaps reported in the full run's notes): themes `protest-revolution`,
  `organized-crime`, `murder-serial-killers`, `anti-lgbtq`, `inequality-class` and `disasters`.
  Only stories likely to use them are re-tagged (`tagging/batches/retag-0.7.0.txt`).

## Open questions

None at the moment. Vocabulary gaps reported by the pilot tagging will reopen this section.
