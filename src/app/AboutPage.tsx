import { Link } from 'react-router';
import { useCatalog } from '@/app/queries';
import { formatYear } from '@/features/catalog/format';
import { aboutStats } from './about-stats';

const num = new Intl.NumberFormat('en');

export function AboutPage() {
  const catalog = useCatalog();
  const stats = catalog.data ? aboutStats(catalog.data) : null;

  return (
    <div className="page page-narrow prose">
      <h1 className="page-title">About</h1>
      <p className="page-lead">
        {__APP_NAME__} is an unofficial index of <cite>Behind the Bastards</cite>, the history
        podcast about the worst people who ever lived. It lets you find stories by period, theme,
        place and who the subjects were.
      </p>

      {stats ? (
        <dl className="about-stats" aria-label="The catalogue in numbers">
          <div>
            <dt>Stories</dt>
            <dd>{num.format(stats.stories)}</dd>
          </div>
          <div>
            <dt>Episodes</dt>
            <dd>{num.format(stats.episodes)}</dd>
          </div>
          <div>
            <dt>Hours of listening</dt>
            <dd>{num.format(stats.hours)}</dd>
          </div>
          <div>
            <dt>Reviewed by a person</dt>
            <dd>{num.format(stats.reviewed)}</dd>
          </div>
          {stats.earliest !== null && stats.latest !== null ? (
            <div>
              <dt>Years covered</dt>
              <dd>
                {formatYear(stats.earliest)} to {formatYear(stats.latest)}
              </dd>
            </div>
          ) : null}
          <div>
            <dt>Themes in use</dt>
            <dd>{num.format(stats.themes)}</dd>
          </div>
        </dl>
      ) : null}

      <h2>Where the data comes from</h2>
      <p>
        Episode titles, dates and descriptions come from the show&apos;s public podcast feed.
        Multi-part episodes are grouped into one story. Each story is then tagged against a fixed
        vocabulary of themes, roles, places and periods, using the episode transcripts. Transcripts
        are never published here. Stories not yet reviewed by a person are marked Unreviewed.
      </p>
      <h2>How periods work</h2>
      <p>
        Period filters are a guide, not a ruling. A story counts as Victorian if the years it covers
        overlap 1837 to 1901, wherever it happened. For a story about one person, that is usually
        their whole life. Centuries and the year range use the same years.
      </p>
      <h2>Your library</h2>
      <p>
        Marks and notes stay in this browser. Tap the bookmark on any result to mark it listened,
        use Select in the catalogue to mark many at once, or{' '}
        <Link to="/library/catch-up">catch up by release date</Link> if you have heard years of
        episodes already.
      </p>
      <h2>Keyboard shortcuts</h2>
      <dl className="shortcuts">
        <div>
          <dt>
            <kbd>/</kbd>
          </dt>
          <dd>Jump to the search</dd>
        </div>
        <div>
          <dt>
            <kbd>j</kbd> and <kbd>k</kbd>
          </dt>
          <dd>Move to the next or previous story in the results</dd>
        </div>
        <div>
          <dt>
            <kbd>Esc</kbd>
          </dt>
          <dd>Close the open story, or leave select mode</dd>
        </div>
      </dl>
      <h2>Not affiliated</h2>
      <p>
        This site is a fan project. It is not made by, or endorsed by, the show, Cool Zone Media or
        iHeartMedia. Every episode links to its official page. The{' '}
        <a href={__REPO_URL__}>source code is on GitHub</a>.
      </p>
    </div>
  );
}
