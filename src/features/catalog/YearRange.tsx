import { useId, useState } from 'react';
import { formatYear } from './format';
import { STEPS, parseYear, stepAt, yearAt } from './year-scale';

interface Props {
  min: number;
  max: number;
  from: number | null;
  to: number | null;
  /** `live` is true while a slider is being dragged, so the URL can be replaced, not pushed. */
  onChange: (from: number | null, to: number | null, live: boolean) => void;
}

function YearField({
  id,
  label,
  value,
  placeholder,
  onCommit,
}: {
  id: string;
  label: string;
  value: number | null;
  placeholder: string;
  onCommit: (year: number | null) => void;
}) {
  // Remounted (via key) when the committed value changes, so the draft text resets.
  const [text, setText] = useState(value === null ? '' : formatYear(value));
  const commit = () => onCommit(parseYear(text));
  return (
    <div className="year-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="year-input"
        inputMode="text"
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
        }}
      />
    </div>
  );
}

/**
 * A two-handle year range over covered years. Sliders for quick moves, text fields for
 * exact years (negative or "BCE" for years before the common era).
 */
export function YearRange({ min, max, from, to, onChange }: Props) {
  const id = useId();
  const lo = stepAt(from ?? min, min, max);
  const hi = stepAt(to ?? max, min, max);
  const set = (nextFrom: number | null, nextTo: number | null, live: boolean) => {
    const f = nextFrom !== null && nextFrom <= min ? null : nextFrom;
    const t = nextTo !== null && nextTo >= max ? null : nextTo;
    onChange(f, t, live);
  };
  return (
    <div className="year-range">
      <div className="year-sliders">
        <input
          type="range"
          className="year-slider"
          aria-label="Earliest year"
          aria-valuetext={formatYear(from ?? min)}
          min={0}
          max={STEPS}
          value={lo}
          onChange={(e) => set(yearAt(Math.min(Number(e.target.value), hi), min, max), to, true)}
        />
        <input
          type="range"
          className="year-slider"
          aria-label="Latest year"
          aria-valuetext={formatYear(to ?? max)}
          min={0}
          max={STEPS}
          value={hi}
          onChange={(e) => set(from, yearAt(Math.max(Number(e.target.value), lo), min, max), true)}
        />
      </div>
      <div className="year-fields">
        <YearField
          key={`from:${String(from)}`}
          id={`${id}-from`}
          label="From"
          value={from}
          placeholder={formatYear(min)}
          onCommit={(y) => set(y, to !== null && y !== null && y > to ? y : to, false)}
        />
        <YearField
          key={`to:${String(to)}`}
          id={`${id}-to`}
          label="To"
          value={to}
          placeholder={formatYear(max)}
          onCommit={(y) => set(from !== null && y !== null && y < from ? y : from, y, false)}
        />
      </div>
    </div>
  );
}
