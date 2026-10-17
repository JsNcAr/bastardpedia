/**
 * One filter option: a checkbox with its label and story count. As a chip, the
 * visible text is the short label and the full one stays for screen readers.
 */
export function FacetOption({
  label,
  shortLabel,
  count,
  checked,
  onToggle,
  variant = 'row',
}: {
  label: string;
  shortLabel?: string | undefined;
  count: number;
  checked: boolean;
  onToggle: () => void;
  variant?: 'row' | 'chip';
}) {
  return (
    <li>
      <label className={variant === 'chip' ? 'facet-chip' : 'facet-option'}>
        <input type="checkbox" checked={checked} onChange={onToggle} />
        {shortLabel ? (
          <>
            <span className="visually-hidden">{label}</span>
            <span className="facet-option-label" aria-hidden="true">
              {shortLabel}
            </span>
          </>
        ) : (
          <span className="facet-option-label">{label}</span>
        )}
        <span className="facet-option-count" aria-label={`${String(count)} stories`}>
          {count}
        </span>
      </label>
    </li>
  );
}
