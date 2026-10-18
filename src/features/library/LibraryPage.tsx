import { Link, useSearchParams } from 'react-router';
import { useState } from 'react';
import { useBulkStatus, useCatalog, useLibrary, useSaveLibraryEntry } from '@/app/queries';
import { isBlank, type LibraryEntry } from '@/data';
import { Icon } from '@/ui/Icon';
import { StateMessage } from '@/ui/StateMessage';
import { BulkResult, type BulkOutcome } from './BulkResult';
import { LibraryBackup } from './LibraryBackup';
import { Shelf, type ShelfKind } from './Shelf';
import {
  LIBRARY_SORTS,
  libraryProgress,
  parseLibrarySort,
  sortEntries,
  type LibrarySort,
} from './library-view';

const SORT_LABELS: Record<LibrarySort, string> = {
  changed: 'Recently changed',
  title: 'Title',
  released: 'Release date',
};

/** Below this many listened stories, the Library offers the catch-up page. */
const CATCH_UP_BELOW = 10;

export function LibraryPage() {
  const library = useLibrary();
  const catalog = useCatalog();
  const [params, setParams] = useSearchParams();
  const sort = parseLibrarySort(params.get('sort'));
  const stories = new Map((catalog.data?.stories ?? []).map((s) => [s.id, s]));
  const titles = new Map([...stories.values()].map((s) => [s.id, s.title]));
  const entries = sortEntries(library.data ?? [], sort, stories);
  const progress = libraryProgress(entries, stories);
  // Every listened entry counts here, also stories no longer in the catalogue.
  const heard = entries.filter((e) => e.status === 'listened').length;
  const bulk = useBulkStatus();
  const save = useSaveLibraryEntry();
  const [outcome, setOutcome] = useState<BulkOutcome | null>(null);

  // Quick actions on shelf items, each with Undo through the same snapshot.
  const act = (kind: ShelfKind, entry: LibraryEntry, name: string) => {
    if (kind === 'favourite') {
      const next = { ...entry, favourite: false };
      save.mutate(
        { entry: next, blank: isBlank(next) },
        {
          onSuccess: () =>
            setOutcome({
              status: entry.status,
              snapshot: [{ id: entry.id, before: entry }],
              message: `Removed ${name} from favourites.`,
            }),
        },
      );
      return;
    }
    const status = kind === 'want' ? 'listened' : null;
    bulk.mutate(
      { ids: [entry.id], status },
      {
        onSuccess: (snapshot) =>
          setOutcome({
            status,
            snapshot,
            message: status ? `Marked ${name} as listened.` : `Unmarked ${name}.`,
          }),
      },
    );
  };
  const shelf = (title: string, kind: ShelfKind, list: LibraryEntry[]) => (
    <Shelf
      title={title}
      kind={kind}
      entries={list}
      titles={titles}
      busy={bulk.isPending || save.isPending}
      onAction={act}
    />
  );

  return (
    <div className="page page-narrow">
      <h1 className="page-title">Your library</h1>
      <p className="page-lead">Saved in this browser only. Clearing site data removes it.</p>
      {library.isSuccess && heard < CATCH_UP_BELOW ? (
        <aside className="callout catch-up-card" aria-labelledby="catch-up-title">
          <Icon name="calendar-check" />
          <div>
            <p id="catch-up-title" className="callout-title">
              Already a listener?
            </p>
            <p>
              Mark everything you have heard in a minute, by release date.{' '}
              <Link to="/library/catch-up">Catch up</Link>
            </p>
          </div>
        </aside>
      ) : null}
      {library.isPending ? (
        <StateMessage icon="library" title="Loading your library" busy role="status" />
      ) : library.isError ? (
        <StateMessage icon="triangle-alert" title="Your library could not be opened" role="alert">
          <p>Your browser may be blocking site storage for this page.</p>
        </StateMessage>
      ) : entries.length === 0 ? (
        <StateMessage
          icon="bookmark"
          title="Nothing saved yet"
          action={<Link to="/">Browse the catalogue</Link>}
        >
          <p>
            Tap the bookmark on a result to mark it listened, or open a story to mark it Want to
            listen or Favourite, or add a note.
          </p>
        </StateMessage>
      ) : (
        <>
          {catalog.data ? (
            <p className="library-progress" role="status">
              {progress.listened} of {progress.total} stories listened · {progress.want} to listen ·{' '}
              {progress.favourites} {progress.favourites === 1 ? 'favourite' : 'favourites'}
            </p>
          ) : null}
          {heard >= CATCH_UP_BELOW ? (
            <p className="library-tools">
              Mark or fix many at once: <Link to="/library/catch-up">Catch up</Link>, or Select in
              the <Link to="/">catalogue</Link>.
            </p>
          ) : null}
          <div className="segmented" role="group" aria-label="Sort your library">
            {LIBRARY_SORTS.map((o) => (
              <button
                key={o}
                type="button"
                className="segmented-option"
                aria-pressed={sort === o}
                onClick={() => setParams(o === 'changed' ? {} : { sort: o }, { replace: true })}
              >
                {SORT_LABELS[o]}
              </button>
            ))}
          </div>
          <BulkResult outcome={outcome} onDismiss={() => setOutcome(null)} />
          {shelf(
            'Want to listen',
            'want',
            entries.filter((e) => e.status === 'want'),
          )}
          {shelf(
            'Favourites',
            'favourite',
            entries.filter((e) => e.favourite),
          )}
          {shelf(
            'Listened',
            'listened',
            entries.filter((e) => e.status === 'listened'),
          )}
          {shelf(
            'Notes only',
            'note',
            entries.filter((e) => e.status === null && !e.favourite && e.note),
          )}
        </>
      )}
      {library.isSuccess ? <LibraryBackup hasEntries={entries.length > 0} /> : null}
    </div>
  );
}
