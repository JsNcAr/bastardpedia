import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Catalog } from '@shared/schemas/catalog.ts';
import { sampleCatalog } from '@/test/catalog';
import { renderApp } from '@/test/render';

describe('discovery', () => {
  it('lists related stories, keeping the current filters on their links', async () => {
    renderApp('/stories/sample-heinrich-schliemann?era=victorian', sampleCatalog);
    const section = await screen.findByRole('region', { name: 'More like this' });
    const links = within(section).getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
    expect(links.length).toBeLessThanOrEqual(5);
    for (const a of links)
      expect(a.getAttribute('href')).toMatch(/^\/stories\/[^?]+\?era=victorian$/);
    expect(within(section).queryByText(/Heinrich Schliemann/)).not.toBeInTheDocument();
  });

  it('opens a random story from the current results', async () => {
    const user = userEvent.setup();
    const random = vi.spyOn(Math, 'random').mockReturnValue(0);
    try {
      const { router } = renderApp('/?role=explorer-adventurer', sampleCatalog);
      await screen.findByRole('heading', { name: 'The catalogue' });
      const first = screen
        .getAllByRole('link', { name: /./ })
        .find((a) => a.getAttribute('href')?.startsWith('/stories/'));
      await user.click(screen.getByRole('button', { name: 'Surprise me' }));
      expect(router.state.location.pathname).toBe(first?.getAttribute('href')?.split('?')[0]);
      expect(router.state.location.search).toBe('?role=explorer-adventurer');
    } finally {
      random.mockRestore();
    }
  });

  it('links subjects with a Wikidata id to Wikipedia', async () => {
    const catalog: Catalog = structuredClone(sampleCatalog);
    const fawcett = catalog.stories.find((s) => s.id === 'sample-percy-fawcett')!;
    fawcett.subjects[0] = { ...fawcett.subjects[0]!, wikidata: 'Q454716' };
    renderApp('/stories/sample-percy-fawcett', catalog);
    const link = await screen.findByRole('link', {
      name: 'Percy Fawcett on Wikipedia (opens in a new tab)',
    });
    expect(link).toHaveAttribute(
      'href',
      'https://www.wikidata.org/wiki/Special:GoToLinkedPage/enwiki/Q454716',
    );
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('copies a clean story link and says so', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    renderApp('/stories/sample-percy-fawcett?era=victorian', sampleCatalog);
    await user.click(await screen.findByRole('button', { name: 'Copy link' }));
    expect(writeText).toHaveBeenCalledWith(
      `${window.location.origin}/stories/sample-percy-fawcett`,
    );
    await waitFor(() => expect(screen.getByText('Link copied')).toBeInTheDocument());
  });
});
