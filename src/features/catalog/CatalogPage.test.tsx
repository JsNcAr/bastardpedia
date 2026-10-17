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
});
