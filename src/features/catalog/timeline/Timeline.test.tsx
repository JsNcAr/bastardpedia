import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Catalog } from '@shared/schemas/catalog.ts';
import { sampleCatalog } from '@/test/catalog';
import { renderApp } from '@/test/render';

const rowTitles = (name = 'Stories') =>
  within(screen.getByRole('list', { name }))
    .getAllByRole('link')
    .map((a) => a.querySelector('.timeline-title')?.textContent);

const row = (id: string) => document.querySelector<HTMLAnchorElement>(`a[data-story="${id}"]`);

describe('timeline view', () => {
  it('switches from the list with the toggle and keeps it in the URL', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/', sampleCatalog);
    await screen.findByRole('heading', { name: 'The catalogue' });
    const toggle = screen.getByRole('group', { name: 'Show results as' });
    await user.click(within(toggle).getByRole('button', { name: 'Timeline' }));
    expect(router.state.location.search).toBe('?view=timeline');
    expect(within(toggle).getByRole('button', { name: 'Timeline' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(document.querySelectorAll('.timeline-row')).toHaveLength(8);
    await user.click(within(toggle).getByRole('button', { name: 'List' }));
    expect(router.state.location.search).toBe('');
  });

  it('orders rows by period unless a sort is chosen', async () => {
    renderApp('/?view=timeline', sampleCatalog);
    await screen.findByRole('heading', { name: 'The catalogue' });
    expect(rowTitles()[0]).toMatch(/Schliemann/);
    expect(rowTitles().at(-1)).toMatch(/Tate/);
    const sort = screen.getByRole('group', { name: 'Sort stories' });
    expect(within(sort).getByRole('button', { name: 'By period' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('labels each row with its years and summarises the density strip', async () => {
    renderApp('/?view=timeline', sampleCatalog);
    await screen.findByRole('heading', { name: 'The catalogue' });
    expect(row('sample-percy-fawcett')).toHaveTextContent('1867 to 1925');
    const chart = screen.getByRole('img', { name: /^Stories per / });
    expect(chart).toHaveAccessibleName(
      'Stories per 5 years, 1820 to 2023. Busiest: 1865 to 1869, 4 stories.',
    );
  });

  it('marks a story that runs off the start of a zoomed axis', async () => {
    renderApp('/?view=timeline&from=1900&to=1950', sampleCatalog);
    await screen.findByRole('heading', { name: 'The catalogue' });
    expect(row('sample-percy-fawcett')?.querySelectorAll('.timeline-clip')).toHaveLength(1);
    expect(row('sample-triangle-shirtwaist-fire')?.querySelector('.timeline-clip')).toBeNull();
  });

  it('moves through timeline rows with j and k', async () => {
    const user = userEvent.setup();
    renderApp('/?view=timeline', sampleCatalog);
    await screen.findByRole('heading', { name: 'The catalogue' });
    await user.click(document.body);
    await user.keyboard('j');
    const links = document.querySelectorAll<HTMLAnchorElement>('.timeline-row');
    expect(document.activeElement).toBe(links[0]);
    await user.keyboard('j');
    expect(document.activeElement).toBe(links[1]);
    await user.keyboard('k');
    expect(document.activeElement).toBe(links[0]);
  });

  it('lists stories without dates after the timeline', async () => {
    const catalog: Catalog = {
      ...sampleCatalog,
      stories: sampleCatalog.stories.map((s) =>
        s.id === 'sample-nestle' ? { ...s, time: null } : s,
      ),
    };
    renderApp('/?view=timeline', catalog);
    await screen.findByRole('heading', { name: 'No dates' });
    expect(rowTitles('Stories')).toHaveLength(7);
    expect(rowTitles('Stories without dates')).toEqual([expect.stringMatching(/Nestl/)]);
    expect(row('sample-nestle')).toHaveTextContent('Dates unknown');
  });
});
