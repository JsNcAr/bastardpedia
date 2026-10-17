import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FacetList, type FacetListOption } from './FacetList';

const many = (n: number): FacetListOption[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `c${String(i)}`,
    label: i === 3 ? 'Paraguay' : i === 4 ? 'Côte d’Ivoire' : `Country ${String(i)}`,
    count: n - i,
    checked: false,
    group: i % 2 ? 'Americas' : 'Africa',
  }));

describe('FacetList', () => {
  it('starts with the top options and expands to the grouped full list', async () => {
    const user = userEvent.setup();
    render(<FacetList options={many(30)} noun="countries" onToggle={vi.fn()} />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(5);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    const more = screen.getByRole('button', { name: 'Show all 30 countries' });
    expect(more).toHaveAttribute('aria-expanded', 'false');
    await user.click(more);
    expect(screen.getAllByRole('checkbox')).toHaveLength(30);
    expect(screen.getByRole('heading', { name: 'Americas' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show fewer' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('finds options in a long list, ignoring accents', async () => {
    const user = userEvent.setup();
    render(<FacetList options={many(30)} noun="countries" onToggle={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Show all 30 countries' }));
    await user.type(screen.getByRole('searchbox', { name: 'Find countries' }), 'cote');
    expect(screen.getAllByRole('checkbox').map((c) => c.closest('label')?.textContent)).toEqual([
      'Côte d’Ivoire26',
    ]);
    await user.clear(screen.getByRole('searchbox', { name: 'Find countries' }));
    await user.type(screen.getByRole('searchbox', { name: 'Find countries' }), 'zzz');
    expect(screen.getByText('No countries match.')).toBeInTheDocument();
  });

  it('shows short lists whole, without a toggle or find box', () => {
    render(<FacetList options={many(7)} noun="types" onToggle={vi.fn()} />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(7);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('collapses ordered lists to their first entries and reports toggles', async () => {
    const user = userEvent.setup();
    const seen: string[] = [];
    render(
      <FacetList
        options={many(12)}
        noun="centuries"
        onToggle={(id) => seen.push(id)}
        limit={8}
        collapse="first"
        variant="chip"
      />,
    );
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(8);
    await user.click(boxes[0]!);
    expect(seen).toEqual(['c0']);
  });
});
