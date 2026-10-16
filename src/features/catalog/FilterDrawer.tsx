import { useEffect, useRef, type ReactNode } from 'react';
import { useUi } from '@/app/ui-store';
import { Icon } from '@/ui/Icon';

/** Filters on narrow screens: a modal <dialog>, which brings its own focus trap and Escape. */
export function FilterDrawer({
  resultCount,
  children,
}: {
  resultCount: number;
  children: ReactNode;
}) {
  const open = useUi((s) => s.filtersOpen);
  const setOpen = useUi((s) => s.setFiltersOpen);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || typeof dialog.showModal !== 'function') return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="drawer"
      aria-labelledby="filters-title"
      onClose={() => setOpen(false)}
    >
      <div className="drawer-head">
        <h2 id="filters-title" className="drawer-title">
          Filters
        </h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close filters"
          onClick={() => setOpen(false)}
        >
          <Icon name="x" />
        </button>
      </div>
      <div className="drawer-body">{children}</div>
      <div className="drawer-foot">
        <button
          type="button"
          className="button button-primary button-block"
          onClick={() => setOpen(false)}
        >
          Show {resultCount === 1 ? '1 story' : `${String(resultCount)} stories`}
        </button>
      </div>
    </dialog>
  );
}
