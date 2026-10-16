export function AboutPage() {
  return (
    <div className="page page-narrow prose">
      <h1 className="page-title">About</h1>
      <p className="page-lead">
        {__APP_NAME__} is an unofficial index of <cite>Behind the Bastards</cite>, the history
        podcast about the worst people who ever lived. It lets you find stories by period, theme,
        place and who the subjects were.
      </p>
      <h2>Where the data comes from</h2>
      <p>
        Episode titles, dates and descriptions come from the show&apos;s public podcast feed.
        Multi-part episodes are grouped into one story. Each story is then tagged against a fixed
        vocabulary of themes, roles, places and periods, using the episode transcripts. Transcripts
        are never published here.
      </p>
      <h2>How periods work</h2>
      <p>
        Period filters are a guide, not a ruling. A story counts as Victorian if the years of its
        main events overlap 1837 to 1901, wherever it happened. Centuries are worked out from the
        same years.
      </p>
      <h2>Not affiliated</h2>
      <p>
        This site is a fan project. It is not made by, or endorsed by, the show, Cool Zone Media or
        iHeartMedia. Every episode links to its official page.
      </p>
    </div>
  );
}
