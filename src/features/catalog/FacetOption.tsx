export function FacetOption({
  label,
  count,
  checked,
  onToggle,
}: {
  label: string;
  count: number;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <label className="facet-option">
        <input type="checkbox" checked={checked} onChange={onToggle} />
        <span className="facet-option-label">{label}</span>
        <span className="facet-option-count" aria-label={`${String(count)} stories`}>
          {count}
        </span>
      </label>
    </li>
  );
}
