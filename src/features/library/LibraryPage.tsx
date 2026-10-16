import { Link } from 'react-router';
import { useCatalog, useLibrary } from '@/app/queries';
import type { LibraryEntry } from '@/data';
import { StateMessage } from '@/ui/StateMessage';

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
  const titles = new Map((catalog.data?.stories ?? []).map((s) => [s.id, s.title]));
  const entries = [...(library.data ?? [])].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

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
    </div>
  );
}
