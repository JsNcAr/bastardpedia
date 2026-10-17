import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createLibraryRepository, emptyEntry } from '@/data/library';
import { sampleCatalog } from '@/test/catalog';
import { renderApp } from '@/test/render';

describe('polish', () => {
  it('shows the catalogue in numbers on the About page', async () => {
    renderApp('/about', sampleCatalog);
    const list = await screen.findByLabelText('The catalogue in numbers');
    expect(within(list).getByText('Stories').nextElementSibling).toHaveTextContent(
      String(sampleCatalog.stories.length),
    );
    expect(within(list).getByText('Reviewed by a person').nextElementSibling).toHaveTextContent(
      '4',
    );
    expect(screen.getByRole('heading', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
    expect(screen.getByText(/years it covers overlap/)).toBeInTheDocument();
  });

  it('shows library progress and sorts the shelves', async () => {
    const user = userEvent.setup();
    const library = createLibraryRepository('polish-library');
    await library.put({ ...emptyEntry('sample-percy-fawcett'), status: 'want' });
    await library.put({ ...emptyEntry('sample-heinrich-schliemann'), status: 'want' });
    const { router } = renderApp('/library', sampleCatalog, library);
    expect(await screen.findByText(/0 of 8 stories listened · 2 to listen/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Title' }));
    expect(router.state.location.search).toBe('?sort=title');
    const shelf = screen.getByRole('region', { name: 'Want to listen' });
    expect(
      within(shelf)
        .getAllByRole('link')
        .map((a) => a.textContent),
    ).toEqual([
      expect.stringMatching(/^Heinrich Schliemann/),
      expect.stringMatching(/^Percy Fawcett/),
    ]);
  });

  it('jumps to the search with / and moves through results with j and k', async () => {
    const user = userEvent.setup();
    renderApp('/', sampleCatalog);
    await screen.findByRole('heading', { name: 'The catalogue' });
    await user.click(document.body);
    await user.keyboard('j');
    const links = document.querySelectorAll<HTMLAnchorElement>('.results a.result');
    expect(document.activeElement).toBe(links[0]);
    await user.keyboard('j');
    expect(document.activeElement).toBe(links[1]);
    await user.keyboard('k');
    expect(document.activeElement).toBe(links[0]);
    await user.keyboard('/');
    expect(document.activeElement).toBe(screen.getByRole('searchbox', { name: 'Search stories' }));
    await user.keyboard('j');
    expect(screen.getByRole('searchbox', { name: 'Search stories' })).toHaveValue('j');
  });

  it('marks the words a search matched', async () => {
    renderApp('/?q=troy', sampleCatalog);
    await waitFor(() => expect(document.querySelector('.results mark.hit')).not.toBeNull());
    expect(
      [...document.querySelectorAll('.results mark.hit')].map((m) => m.textContent.toLowerCase()),
    ).toContain('troy');
  });
});
