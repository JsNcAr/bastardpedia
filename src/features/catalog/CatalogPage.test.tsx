import { createLibraryRepository, emptyEntry } from '@/data/library';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { emptyCatalog, sampleCatalog } from '@/test/catalog';
import { renderApp } from '@/test/render';

const resultTitles = () =>
  within(screen.getByRole('list', { name: 'Stories' }))
    .getAllByRole('link')
    .map((a) => a.querySelector('.result-title')?.textContent);

describe('catalogue page', () => {
  it('explains the empty catalogue before any tagging has run', async () => {
    renderApp('/', emptyCatalog);
    expect(
      await screen.findByRole('heading', { name: 'No stories have been tagged yet' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/npm run build:catalog/)).toBeInTheDocument();
  });

  it('applies filters from the URL', async () => {
    renderApp('/?era=victorian&role=explorer-adventurer', sampleCatalog);
    await screen.findByRole('heading', { name: 'The catalogue' });
    const titles = resultTitles();
    expect(titles).toHaveLength(3);
    expect(titles.join(' ')).toMatch(/Schliemann/);
    expect(titles.join(' ')).toMatch(/Stanley/);
    expect(titles.join(' ')).toMatch(/Fawcett/);
    expect(titles.join(' ')).not.toMatch(/Hubbard/);
    expect(screen.getByText('3 stories of 8')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Remove filter: Victorian era (UK)' }),
    ).toBeInTheDocument();
  });

  it('toggling a facet writes the URL, and Clear all resets it', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/', sampleCatalog);
    await screen.findByRole('heading', { name: 'The catalogue' });
    await user.click(screen.getByRole('button', { name: /^Show all \d+ themes$/ }));
    await user.click(screen.getByRole('checkbox', { name: /Cults & new religions/ }));
    expect(router.state.location.search).toBe('?theme=cults-new-religions');
    expect(resultTitles()).toEqual(['How L. Ron Hubbard Lied His Way to Godhood']);
    await user.click(screen.getByRole('button', { name: 'Clear all' }));
    expect(router.state.location.search).toBe('');
    expect(resultTitles()).toHaveLength(8);
  });

  it('keeps a selected option visible while its list is collapsed', async () => {
    renderApp('/?theme=cults-new-religions', sampleCatalog);
    await screen.findByRole('heading', { name: 'The catalogue' });
    expect(screen.getByRole('checkbox', { name: /Cults & new religions/ })).toBeChecked();
    expect(screen.getByRole('button', { name: /^Show all \d+ themes$/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('filters by a century chip', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/', sampleCatalog);
    await screen.findByRole('heading', { name: 'The catalogue' });
    await user.click(screen.getByRole('checkbox', { name: /^20th century/ }));
    expect(router.state.location.search).toBe('?century=20');
  });

  it('closes the story pane with its button, keeping the filters and the focus', async () => {
    const user = userEvent.setup();
    const { router } = renderApp(
      '/stories/sample-percy-fawcett?role=explorer-adventurer',
      sampleCatalog,
    );
    await user.click(await screen.findByRole('link', { name: 'Close story' }));
    expect(router.state.location.pathname).toBe('/');
    expect(router.state.location.search).toBe('?role=explorer-adventurer');
    expect(screen.queryByRole('region', { name: 'Story' })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(
      document.querySelector('[data-story="sample-percy-fawcett"]'),
    );
  });

  it('closes the story pane with Escape, but not while typing', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/stories/sample-percy-fawcett', sampleCatalog);
    await screen.findByRole('link', { name: 'Close story' });
    await user.click(screen.getByRole('searchbox', { name: 'Search stories' }));
    await user.keyboard('{Escape}');
    expect(router.state.location.pathname).toBe('/stories/sample-percy-fawcett');
    await user.click(screen.getByRole('heading', { name: 'The catalogue' }));
    await user.keyboard('{Escape}');
    expect(router.state.location.pathname).toBe('/');
  });

  it('puts the library actions beside the story title', async () => {
    renderApp('/stories/sample-percy-fawcett', sampleCatalog);
    const story = await screen.findByRole('article');
    const actions = within(story).getByRole('group', { name: 'Your library' });
    expect(story.querySelector('.story-head')).toContainElement(actions);
    expect(within(actions).getByRole('button', { name: 'Listened' })).toBeInTheDocument();
  });

  it('marks library stories in the results and can hide the listened ones', async () => {
    const user = userEvent.setup();
    const library = createLibraryRepository('catalog-page-marks');
    await library.put({ ...emptyEntry('sample-percy-fawcett'), status: 'listened' });
    await library.put({ ...emptyEntry('sample-nestle'), favourite: true });
    const { router } = renderApp('/', sampleCatalog, library);
    const fawcett = await screen.findByRole('link', { name: /Percy Fawcett/ });
    await waitFor(() => expect(within(fawcett).getByText('Listened')).toBeInTheDocument());
    expect(
      within(screen.getByRole('link', { name: /Nestl/ })).getByText('Favourite'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /Hide stories I've listened to/ }));
    expect(router.state.location.search).toBe('?hide-listened=1');
    expect(screen.queryByRole('link', { name: /Percy Fawcett/ })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Remove filter: Hiding listened/ }),
    ).toBeInTheDocument();
  });

  it('shows the search above the results on narrow screens, once', async () => {
    const spy = vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: false,
          media: query,
          onchange: null,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          addListener: () => undefined,
          removeListener: () => undefined,
          dispatchEvent: () => false,
        }) as MediaQueryList,
    );
    try {
      renderApp('/', sampleCatalog);
      await screen.findByRole('heading', { name: 'The catalogue' });
      const boxes = screen.getAllByRole('searchbox', { name: 'Search stories' });
      expect(boxes).toHaveLength(1);
      expect(screen.getByRole('region', { name: 'The catalogue' })).toContainElement(boxes[0]!);
    } finally {
      spy.mockRestore();
    }
  });

  it('says so when filters match nothing', async () => {
    renderApp('/?era=victorian&theme=cults-new-religions', sampleCatalog);
    expect(
      await screen.findByRole('heading', { name: 'No stories match these filters' }),
    ).toBeInTheDocument();
  });

  it('opens a story beside the results, keeping the filters', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/?role=explorer-adventurer', sampleCatalog);
    await screen.findByRole('heading', { name: 'The catalogue' });
    await user.click(screen.getByRole('link', { name: /Percy Fawcett/ }));
    expect(router.state.location.pathname).toBe('/stories/sample-percy-fawcett');
    expect(router.state.location.search).toBe('?role=explorer-adventurer');
    const story = await screen.findByRole('article');
    expect(
      within(story).getByRole('heading', { level: 2, name: /Percy Fawcett/ }),
    ).toBeInTheDocument();
    expect(
      within(story).getByText('1906 to 1925, with consequences to the present'),
    ).toBeInTheDocument();
    expect(within(story).getByRole('link', { name: 'Edwardian era (UK)' })).toHaveAttribute(
      'href',
      '/?era=edwardian',
    );
  });

  it('saves library marks for a story', async () => {
    const user = userEvent.setup();
    renderApp('/stories/sample-nestle', sampleCatalog);
    const want = await screen.findByRole('button', { name: 'Want to listen' });
    await waitFor(() => expect(want).toBeEnabled());
    await user.click(want);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Want to listen' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    );
  });

  it('shows a not-found state for an unknown story', async () => {
    renderApp('/stories/nope', sampleCatalog);
    expect(await screen.findByRole('heading', { name: 'Story not found' })).toBeInTheDocument();
  });

  it('keeps the review filter in a closed group near the end of the rail', async () => {
    const first = renderApp('/', sampleCatalog);
    await screen.findByRole('heading', { name: 'The catalogue' });
    const group = screen.getByText('Review status').closest('details');
    expect(group).not.toHaveAttribute('open');
    const groups = [...document.querySelectorAll('.facet-rail details.facet-group')];
    expect(groups.at(-1)).toBe(group);
    first.unmount();

    renderApp('/?reviewed=1', sampleCatalog);
    await screen.findByRole('heading', { name: 'The catalogue' });
    expect(screen.getByText('Review status').closest('details')).toHaveAttribute('open');
    expect(screen.getByRole('checkbox', { name: /Reviewed by a person only/ })).toBeChecked();
  });
});
