import { Link } from 'react-router';
import type { Catalog, CatalogStory } from '@shared/schemas/catalog.ts';
import { Icon } from '@/ui/Icon';
import { tagSearch, type Facet } from '@/features/catalog/filter-model';
import {
  centuryLabel,
  formatDuration,
  formatSpan,
  partsLabel,
  storyPeriod,
} from '@/features/catalog/format';
import type { Labels } from '@/features/catalog/labels';
import { LibraryControls } from './LibraryControls';

const dateFmt = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long', day: 'numeric' });

function Tags({ facet, values, labels }: { facet: Facet; values: string[]; labels: Labels }) {
  if (values.length === 0) return null;
  return (
    <ul className="tags">
      {values.map((v) => (
        <li key={v}>
          <Link className="tag" to={tagSearch(facet, v)}>
            {labels.of(facet, v)}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function StoryDetail({
  story,
  catalog,
  labels,
  headingLevel,
}: {
  story: CatalogStory;
  catalog: Catalog;
  labels: Labels;
  headingLevel: 1 | 2;
}) {
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  const period = storyPeriod(story);
  const eraOrder = new Map(catalog.eras.map((e, i) => [e.id, i]));
  const eras = [...story.derived.eras].sort(
    (a, b) => (eraOrder.get(a) ?? 0) - (eraOrder.get(b) ?? 0),
  );
  const knownCountries = new Set(catalog.countries.map((c) => c.code));

  return (
    <article className="story" aria-labelledby="story-title">
      <header className="story-head">
        <p className="story-kicker">
          {labels.of('format', story.format)}
          {period ? ` · ${period}` : ''}
        </p>
        <Heading id="story-title" className="story-title">
          {story.title}
        </Heading>
        <p className="story-summary">{story.summary}</p>
      </header>

      <dl className="facts">
        {story.time ? (
          <div>
            <dt>Main events</dt>
            <dd>
              {formatSpan(story.time.main_span, story.time.approximate)}
              {story.time.reaches_present ? ', with consequences to the present' : ''}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Length</dt>
          <dd>
            {partsLabel(story.parts.length)}, {formatDuration(story.total_duration_s)}
          </dd>
        </div>
        <div>
          <dt>First released</dt>
          <dd>{dateFmt.format(new Date(story.first_published))}</dd>
        </div>
        {story.guests.length > 0 ? (
          <div>
            <dt>Guests</dt>
            <dd>{story.guests.join(', ')}</dd>
          </div>
        ) : null}
      </dl>

      {story.content_warnings.length > 0 ? (
        <aside className="callout" aria-label="Content warnings">
          <Icon name="triangle-alert" />
          <div>
            <p className="callout-title">Content warnings</p>
            <p>
              Describes in detail:{' '}
              {story.content_warnings.map((w) => labels.warning(w).toLowerCase()).join(', ')}.
            </p>
          </div>
        </aside>
      ) : null}

      <section className="story-section" aria-labelledby="subjects-title">
        <h3 id="subjects-title" className="section-title">
          Who and what
        </h3>
        <ul className="subjects">
          {story.subjects.map((s) => (
            <li key={s.name} className="subject">
              <span className="subject-name">{s.name}</span>
              <span className="subject-meta">
                {s.org_type ? labels.orgType(s.org_type) : labels.subjectKind(s.kind)}
                {s.role === 'secondary' ? ', secondary' : ''}
                {s.lifespan ? ` · ${formatSpan(s.lifespan)}` : ''}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="story-section" aria-labelledby="tags-title">
        <h3 id="tags-title" className="section-title">
          Filed under
        </h3>
        <dl className="tag-groups">
          <div>
            <dt>Main theme</dt>
            <dd>
              <Tags facet="theme" values={[story.themes.primary]} labels={labels} />
            </dd>
          </div>
          {story.themes.secondary.length > 0 ? (
            <div>
              <dt>Also about</dt>
              <dd>
                <Tags facet="theme" values={story.themes.secondary} labels={labels} />
              </dd>
            </div>
          ) : null}
          {story.roles.length > 0 ? (
            <div>
              <dt>Who they were</dt>
              <dd>
                <Tags facet="role" values={story.roles} labels={labels} />
              </dd>
            </div>
          ) : null}
          {story.regions.origin.length > 0 ? (
            <div>
              <dt>From</dt>
              <dd>
                <Tags
                  facet="country"
                  values={story.regions.origin.filter((c) => knownCountries.has(c))}
                  labels={labels}
                />
              </dd>
            </div>
          ) : null}
          {story.regions.setting.length > 0 ? (
            <div>
              <dt>Set in</dt>
              <dd>
                <Tags
                  facet="country"
                  values={story.regions.setting.filter((c) => knownCountries.has(c))}
                  labels={labels}
                />
              </dd>
            </div>
          ) : null}
          {story.regions.polities.length > 0 ? (
            <div>
              <dt>Historical states</dt>
              <dd>{story.regions.polities.map((p) => labels.polity(p)).join(', ')}</dd>
            </div>
          ) : null}
          {eras.length > 0 ? (
            <div>
              <dt>Periods</dt>
              <dd>
                <Tags facet="era" values={eras} labels={labels} />
              </dd>
            </div>
          ) : null}
          {story.derived.centuries.length > 0 ? (
            <div>
              <dt>Centuries</dt>
              <dd>
                <ul className="tags">
                  {story.derived.centuries.map((c) => (
                    <li key={c}>
                      <Link className="tag" to={tagSearch('century', c)}>
                        {centuryLabel(c)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}
          {story.keywords.length > 0 ? (
            <div>
              <dt>Keywords</dt>
              <dd>{story.keywords.join(', ')}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="story-section" aria-labelledby="episodes-title">
        <h3 id="episodes-title" className="section-title">
          Episodes
        </h3>
        <ol className="episodes">
          {story.parts.map((p) => (
            <li key={`${String(p.part)}-${p.title}`} className="episode">
              <span className="episode-title">{p.title}</span>
              <span className="episode-meta">
                {dateFmt.format(new Date(p.published))}
                {p.duration_s ? ` · ${formatDuration(p.duration_s)}` : ''}
              </span>
              {p.link ? (
                <a className="episode-link" href={p.link} target="_blank" rel="noopener noreferrer">
                  Official episode page
                  <Icon name="external-link" size="sm" />
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      <LibraryControls storyId={story.id} />
    </article>
  );
}
