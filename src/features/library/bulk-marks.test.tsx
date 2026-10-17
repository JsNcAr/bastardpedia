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

  it('a click anywhere on a card ticks it instead of opening the story', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/', sampleCatalog, freshLibrary());
    await screen.findByRole('heading', { name: 'The catalogue' });
    await user.click(screen.getByRole('button', { name: 'Select' }));
    const title = screen.getByText(titleOf('sample-percy-fawcett'), {
      selector: '.result-title *, .result-title',
    });
    await user.click(title);
    expect(router.state.location.pathname).toBe('/');
    expect(
      screen.getByRole('checkbox', { name: new RegExp(`^Select: .*${FAWCETT}`) }),
    ).toBeChecked();
    expect(screen.getByText('1 selected')).toBeInTheDocument();
    // The click focused the card's checkbox; j moves on to the next one.
    const boxes = screen.getAllByRole('checkbox', { name: /^Select: / });
    const at = boxes.findIndex((b) => b === document.activeElement);
    expect(boxes[at]).toHaveAccessibleName(new RegExp(FAWCETT));
    await user.keyboard('j');
    expect(document.activeElement).toBe(boxes[at + 1]);
    await user.click(screen.getByRole('button', { name: 'Done' }));
    await user.click(
      screen.getByText(titleOf('sample-percy-fawcett'), {
        selector: '.result-title *, .result-title',
      }),
    );
    expect(router.state.location.pathname).toBe('/stories/sample-percy-fawcett');
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
  it('starts with nothing ticked, and a release-date choice re-ticks the list', async () => {
    const user = userEvent.setup();
    const library = freshLibrary();
    await library.put({ ...emptyEntry('sample-henry-morton-stanley'), status: 'listened' });
    renderApp('/library/catch-up', sampleCatalog, library);
    await screen.findByRole('heading', { name: 'Catch up' });
    const summary = () => document.querySelector('.catch-summary')?.textContent ?? '';
    await waitFor(() => expect(summary()).toMatch(/^1 story ticked.*1 already marked listened/));
    expect(screen.getByRole('button', { name: 'Mark 0 stories as listened' })).toBeDisabled();

    // Step 1 is optional: a story can be ticked by hand.
    const year2026 = screen.getByRole('region', { name: '2026' });
    await user.click(within(year2026).getByRole('checkbox', { name: /All of 2026/ }));
    expect(screen.getByRole('button', { name: 'Mark 2 stories as listened' })).toBeEnabled();

    // A release-date choice replaces the ticks, so the 2026 ticks go.
    await user.click(screen.getByRole('radio', { name: 'Everything up to a month' }));
    fireEvent.change(screen.getByLabelText('Up to', { selector: 'input[type="month"]' }), {
      target: { value: '2021-07' },
    });
    expect(summary()).toMatch(/^4 stories ticked, 7 episodes, about 7 hours/);
    expect(within(year2026).getByRole('checkbox', { name: /All of 2026/ })).not.toBeChecked();

    // 2021 is mixed (Nestle came out in September): one click ticks the whole
    // year, a second unticks it.
    const year2021 = screen.getByRole('region', { name: '2021' });
    const all2021 = within(year2021).getByRole('checkbox', { name: /All of 2021/ });
    await user.click(all2021);
    expect(summary()).toMatch(/^5 stories ticked/);
    await user.click(all2021);
    expect(summary()).toMatch(/^2 stories ticked/);
    await user.click(all2021);

    // Step 3: leaving out a format hides its stories and leaves them unmarked.
    await user.click(screen.getByRole('checkbox', { name: /Reading \/ watching/ }));
    expect(summary()).toMatch(/^4 stories ticked/);

    await user.click(screen.getByRole('button', { name: 'Mark 3 stories as listened' }));
    expect(await screen.findByText('Marked 3 stories as listened.')).toBeInTheDocument();
    expect(await statuses(library)).toEqual({
      'sample-henry-morton-stanley': 'listened',
      'sample-l-ron-hubbard': 'listened',
      'sample-nestle': 'listened',
      'sample-triangle-shirtwaist-fire': 'listened',
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
