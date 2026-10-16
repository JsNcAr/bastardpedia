import type { ReactNode } from 'react';
import { Icon } from '@/ui/Icon';

/** A collapsible facet section. Native <details> gives keyboard and screen-reader support for free. */
export function FacetGroup({
  title,
  selected,
  defaultOpen = false,
  children,
}: {
  title: string;
  selected: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="facet-group" open={defaultOpen || selected > 0}>
      <summary className="facet-summary">
        <span className="facet-title">{title}</span>
        {selected > 0 ? <span className="facet-selected">{selected} selected</span> : null}
        <span className="facet-chevron">
          <Icon name="chevron-down" size="sm" />
        </span>
      </summary>
      <div className="facet-body">{children}</div>
    </details>
  );
}

export function FacetSubgroup({
  title,
  children,
}: {
  title?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="facet-subgroup">
      {title ? <h3 className="facet-subtitle">{title}</h3> : null}
      <ul className="facet-options">{children}</ul>
    </div>
  );
}
