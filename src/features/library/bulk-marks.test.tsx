import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createLibraryRepository, emptyEntry } from '@/data/library';
import { toBackup } from './backup';
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
  it('starts from what is listened, adds by release date, and saves marks and unmarks', async () => {
    const user = userEvent.setup();
    const library = freshLibrary();
    await library.put({
      ...emptyEntry('sample-henry-morton-stanley'),
      status: 'listened',
      note: 'keep',
    });
    await library.put({ ...emptyEntry('sample-nestle'), status: 'listened' });
    renderApp('/library/catch-up', sampleCatalog, library);
    await screen.findByRole('heading', { name: 'Catch up' });
    const summary = () => document.querySelector('.catch-summary')?.textContent ?? '';
    const bar = await screen.findByRole('region', { name: 'Save changes' });
    await waitFor(() => expect(summary()).toMatch(/^2 stories ticked/));
    expect(within(bar).getByText('No changes yet')).toBeInTheDocument();
    expect(within(bar).getByRole('button', { name: 'Save' })).toBeDisabled();

    // A release-date choice adds to the listened stories; it never unticks them.
    await user.click(screen.getByRole('radio', { name: 'Everything up to a month' }));
    fireEvent.change(screen.getByLabelText('Up to', { selector: 'input[type="month"]' }), {
      target: { value: '2021-07' },
    });
    expect(summary()).toMatch(/^5 stories ticked/);
    expect(within(bar).getByText('3 to mark')).toBeInTheDocument();

    // A tap on a story's title toggles its box: untick Nestle, which is listened.
    const nestle = screen.getByRole('checkbox', { name: /Nestl/ });
    expect(nestle).toBeChecked();
    await user.click(screen.getByText(/Nestl/, { selector: '.catch-story-title' }));
    expect(nestle).not.toBeChecked();
    expect(within(bar).getByText('3 to mark, 1 to unmark')).toBeInTheDocument();

    // A left-out format is neither marked nor unmarked.
    await user.click(screen.getByRole('checkbox', { name: /Reading \/ watching/ }));
    expect(within(bar).getByText('2 to mark, 1 to unmark')).toBeInTheDocument();

    await user.click(within(bar).getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText('Marked 2 stories as listened and unmarked 1 story.'),
    ).toBeInTheDocument();
    expect(await statuses(library)).toEqual({
      'sample-henry-morton-stanley': 'listened',
      'sample-l-ron-hubbard': 'listened',
      'sample-triangle-shirtwaist-fire': 'listened',
    });
    expect((await library.get('sample-henry-morton-stanley'))?.note).toBe('keep');
    await waitFor(() => expect(within(bar).getByText('No changes yet')).toBeInTheDocument());

    // One Undo restores both halves.
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(await screen.findByText('Undone.')).toBeInTheDocument();
    expect(await statuses(library)).toEqual({
      'sample-henry-morton-stanley': 'listened',
      'sample-nestle': 'listened',
    });
  });
});

describe('finding the catch-up', () => {
  it('stays reachable from the rail, the Library and an import', async () => {
    const user = userEvent.setup();
    const library = freshLibrary();
    const first = renderApp('/library', sampleCatalog, library);
    expect(await screen.findByText('Already a listener?')).toBeInTheDocument();

    // Importing a backup points to the catch-up to check the result.
    const backup = toBackup([{ ...emptyEntry('sample-nestle'), status: 'listened' }]);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(
      input,
      new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' }),
    );
    expect(await screen.findByRole('link', { name: 'Check them in Catch up' })).toHaveAttribute(
      'href',
      '/library/catch-up',
    );
    first.unmount();

    // The rail keeps a link once something is listened.
    const second = renderApp('/', sampleCatalog, library);
    expect(
      await screen.findByRole('checkbox', { name: /Hide stories I've listened to/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mark more by release date' })).toHaveAttribute(
      'href',
      '/library/catch-up',
    );
    second.unmount();

    // With many listened, the Library swaps the intro card for a tools line.
    await library.setStatusMany(
      sampleCatalog.stories.map((s) => s.id),
      'listened',
    );
    await library.setStatusMany(
      Array.from({ length: 4 }, (_, i) => `gone-${String(i)}`),
      'listened',
    );
    renderApp('/library', sampleCatalog, library);
    expect(await screen.findByText(/Mark or fix many at once/)).toBeInTheDocument();
    expect(screen.queryByText('Already a listener?')).toBeNull();
  });
});

describe('library shelves', () => {
  it('collapse when long, list 20 then Show all, and find within a shelf', async () => {
    const user = userEvent.setup();
    const library = freshLibrary();
    const gone = Array.from({ length: 24 }, (_, i) => `gone-${String(i).padStart(2, '0')}`);
    await library.setStatusMany([...gone, 'sample-nestle'], 'listened');
    await library.put({ ...emptyEntry('sample-percy-fawcett'), status: 'want' });
    renderApp('/library', sampleCatalog, library);

    const want = await screen.findByRole('group', { name: 'Want to listen' });
    const listened = screen.getByRole('group', { name: 'Listened' });
    expect(want).toHaveAttribute('open');
    expect(listened).not.toHaveAttribute('open');

    await user.click(within(listened).getByText('Listened'));
    expect(within(listened).getAllByRole('listitem')).toHaveLength(20);
    await user.click(within(listened).getByRole('button', { name: 'Show all 25' }));
    expect(within(listened).getAllByRole('listitem')).toHaveLength(25);

    await user.type(
      within(listened).getByRole('searchbox', { name: 'Find in Listened' }),
      'NESTLE',
    );
    expect(within(listened).getAllByRole('listitem')).toHaveLength(1);
  });

  it('marks a want-list story listened from its shelf, with Undo', async () => {
    const user = userEvent.setup();
    const library = freshLibrary();
    await library.put({ ...emptyEntry('sample-percy-fawcett'), status: 'want' });
    renderApp('/library', sampleCatalog, library);
    await user.click(
      await screen.findByRole('button', { name: /^Mark listened: .*Percy Fawcett/ }),
    );
    expect(await screen.findByText(/^Marked .*Percy Fawcett.* as listened\.$/)).toBeInTheDocument();
    expect(await statuses(library)).toEqual({ 'sample-percy-fawcett': 'listened' });
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(await screen.findByText('Undone.')).toBeInTheDocument();
    expect(await statuses(library)).toEqual({ 'sample-percy-fawcett': 'want' });
  });
});
