import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createLibraryRepository, emptyEntry } from '@/data/library';
import { sampleCatalog } from '@/test/catalog';
import { renderApp } from '@/test/render';

let n = 0;
const freshLibrary = () => createLibraryRepository(`bulk-marks-${String(++n)}`);
const statuses = async (library: ReturnType<typeof freshLibrary>) =>
  Object.fromEntries((await library.list()).map((e) => [e.id, e.status]));

const FAWCETT = 'Percy Fawcett';
const titleOf = (id: string) => sampleCatalog.stories.find((s) => s.id === id)?.title ?? '';

describe('one-tap listened mark', () => {
  it('marks and unmarks a story from its row', async () => {
    const user = userEvent.setup();
    const library = freshLibrary();
    renderApp('/', sampleCatalog, library);
    const name = `Listened: ${titleOf('sample-percy-fawcett')}`;
    const button = await screen.findByRole('button', { name });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await user.click(button);
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'));
    expect(await statuses(library)).toEqual({ 'sample-percy-fawcett': 'listened' });
    await user.click(button);
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'false'));
    expect(await statuses(library)).toEqual({});
  });
});

describe('select mode', () => {
  it('marks the selection, and Undo puts every earlier mark back', async () => {
    const user = userEvent.setup();
    const library = freshLibrary();
    await library.put({ ...emptyEntry('sample-nestle'), status: 'want', note: 'soon' });
    renderApp('/?q=fawcett', sampleCatalog, library);
    await screen.findByRole('heading', { name: 'The catalogue' });
    await user.click(screen.getByRole('button', { name: 'Select' }));
    await user.click(screen.getByRole('checkbox', { name: new RegExp(`^Select: .*${FAWCETT}`) }));
    // The selection outlives a new search.
    await user.clear(screen.getByRole('searchbox', { name: 'Search stories' }));
    await user.type(screen.getByRole('searchbox', { name: 'Search stories' }), 'nestle');
    const bar = screen.getByRole('region', { name: 'Selection' });
    await user.click(within(bar).getByRole('button', { name: /^Select all \d+$/ }));
    expect(within(bar).getByText('2 selected')).toBeInTheDocument();

    await user.click(within(bar).getByRole('button', { name: 'Mark listened' }));
    expect(await screen.findByText('Marked 2 stories as listened.')).toBeInTheDocument();
    expect(await statuses(library)).toEqual({
      'sample-nestle': 'listened',
      'sample-percy-fawcett': 'listened',
    });
    expect((await library.get('sample-nestle'))?.note).toBe('soon');
    expect(within(bar).getByText('0 selected')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(await screen.findByText('Undone.')).toBeInTheDocument();
    expect(await statuses(library)).toEqual({ 'sample-nestle': 'want' });
  });

  it('Escape leaves select mode', async () => {
    const user = userEvent.setup();
    renderApp('/', sampleCatalog, freshLibrary());
    await screen.findByRole('heading', { name: 'The catalogue' });
    await user.click(screen.getByRole('button', { name: 'Select' }));
    expect(screen.getAllByRole('checkbox', { name: /^Select: / })).toHaveLength(8);
    await user.click(screen.getAllByRole('checkbox', { name: /^Select: / })[0]!);
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Select' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('region', { name: 'Selection' })).toBeNull();
  });
});

describe('catch-up page', () => {
  it('marks exactly the stories left ticked', async () => {
    const user = userEvent.setup();
    const library = freshLibrary();
    await library.put({ ...emptyEntry('sample-henry-morton-stanley'), status: 'listened' });
    renderApp('/library/catch-up', sampleCatalog, library);
    await screen.findByRole('heading', { name: 'Catch up' });
    await waitFor(() =>
      expect(screen.getByText(/^8 stories, 13 episodes/)).toHaveTextContent(
        '1 already marked listened.',
      ),
    );

    await user.click(screen.getByRole('radio', { name: 'Everything up to a month' }));
    fireEvent.change(screen.getByLabelText('Up to'), { target: { value: '2021-07' } });
    expect(screen.getByText(/^4 stories, 7 episodes, about 7 hours/)).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: /Reading \/ watching/ }));
    expect(screen.getByText(/^3 stories/)).toBeInTheDocument();

    const year2021 = screen.getByRole('region', { name: '2021' });
    await user.click(within(year2021).getByRole('checkbox', { name: /All of 2021/ }));
    expect(screen.getByText(/^2 stories/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mark 1 story as listened' }));
    expect(await screen.findByText('Marked 1 story as listened.')).toBeInTheDocument();
    expect(await statuses(library)).toEqual({
      'sample-henry-morton-stanley': 'listened',
      'sample-l-ron-hubbard': 'listened',
    });
    expect(
      screen.getByRole('link', { name: 'Browse with listened stories hidden' }),
    ).toHaveAttribute('href', '/?hide-listened=1');
  });
});

describe('finding the catch-up', () => {
  it('is offered on the Library page and in the rail until stories are marked', async () => {
    const library = freshLibrary();
    const first = renderApp('/library', sampleCatalog, library);
    expect(await screen.findByText('Already a listener?')).toBeInTheDocument();
    first.unmount();

    const second = renderApp('/', sampleCatalog, library);
    expect(
      await screen.findByRole('link', { name: "Mark what you've already heard" }),
    ).toHaveAttribute('href', '/library/catch-up');
    second.unmount();

    await library.setStatusMany(['sample-nestle'], 'listened');
    renderApp('/', sampleCatalog, library);
    expect(
      await screen.findByRole('checkbox', { name: /Hide stories I've listened to/ }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: "Mark what you've already heard" })).toBeNull();
  });
});
