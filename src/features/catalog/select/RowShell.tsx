import type { ReactNode } from 'react';
import { Link } from 'react-router';

/**
 * The clickable body of a result or timeline row. Normally a link to the story;
 * in select mode a label for the row's checkbox, so a click anywhere on the card
 * ticks it and nothing opens until select mode ends.
 */
export function RowShell({
  storyId,
  search,
  className,
  selected,
  selectFor,
  children,
}: {
  storyId: string;
  search: string;
  className: string;
  selected: boolean;
  /** In select mode, the id of the row's checkbox. */
  selectFor?: string | undefined;
  children: ReactNode;
}) {
  if (selectFor) {
    return (
      <label htmlFor={selectFor} className={`${className} row-selectable`}>
        {children}
      </label>
    );
  }
  return (
    <Link
      to={{ pathname: `/stories/${storyId}`, search }}
      className={className}
      data-story={storyId}
      aria-current={selected ? 'page' : undefined}
      preventScrollReset
    >
      {children}
    </Link>
  );
}
