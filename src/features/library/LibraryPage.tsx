import { Link, useSearchParams } from 'react-router';
import { useCatalog, useLibrary } from '@/app/queries';
import type { LibraryEntry } from '@/data';
import { StateMessage } from '@/ui/StateMessage';
import { LibraryBackup } from './LibraryBackup';
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

function Shelf({
  title,
  entries,
  titles,
}: {
  title: string;
  entries: LibraryEntry[];
  titles: Map<string, string>;
}) {
  if (entries.length === 0) return null;
  return (
    <section className="shelf" aria-label={title}>
      <h2 className="section-title">
        {title} <span className="shelf-count">{entries.length}</span>
      </h2>
      <ul className="shelf-list">
        {entries.map((e) => {
          const name = titles.get(e.id);
          return (
            <li key={e.id} className="shelf-item">
              {name ? (
                <Link to={`/stories/${e.id}`}>{name}</Link>
              ) : (
                <span>
                  {e.id} <span className="shelf-missing">(no longer in the catalogue)</span>
                </span>
              )}
              {e.note ? <p className="shelf-note">{e.note}</p> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function LibraryPage() {
  const library = useLibrary();
  const catalog = useCatalog();
  const [params, setParams] = useSearchParams();
  const sort = parseLibrarySort(params.get('sort'));
  const stories = new Map((catalog.data?.stories ?? []).map((s) => [s.id, s]));
  const titles = new Map([...stories.values()].map((s) => [s.id, s.title]));
  const entries = sortEntries(library.data ?? [], sort, stories);
  const progress = libraryProgress(entries, stories);

  return (
    <div className="page page-narrow">
      <h1 className="page-title">Your library</h1>
      <p className="page-lead">Saved in this browser only. Clearing site data removes it.</p>
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
          <p>Open a story and mark it Want to listen, Listened or Favourite, or add a note.</p>
        </StateMessage>
      ) : (
        <>
          {catalog.data ? (
            <p className="library-progress" role="status">
              {progress.listened} of {progress.total} stories listened · {progress.want} to listen ·{' '}
              {progress.favourites} {progress.favourites === 1 ? 'favourite' : 'favourites'}
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
          <Shelf
            title="Want to listen"
            entries={entries.filter((e) => e.status === 'want')}
            titles={titles}
          />
          <Shelf title="Favourites" entries={entries.filter((e) => e.favourite)} titles={titles} />
          <Shelf
            title="Listened"
            entries={entries.filter((e) => e.status === 'listened')}
            titles={titles}
          />
          <Shelf
            title="Notes only"
            entries={entries.filter((e) => e.status === null && !e.favourite && e.note)}
            titles={titles}
          />
        </>
      )}
      {library.isSuccess ? <LibraryBackup hasEntries={entries.length > 0} /> : null}
    </div>
  );
}
