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
  // A handle moved off its end of the track always sets a year inside the bounds.
  // On a narrow range the curved scale can round a first step back to the bound,
  // which reads as "no limit" and snaps the handle back, so it could never move.
  const fromStep = (step: number) =>
    step > 0 ? Math.max(yearAt(step, min, max), min + 1) : yearAt(step, min, max);
  const toStep = (step: number) =>
    step < STEPS ? Math.min(yearAt(step, min, max), max - 1) : yearAt(step, min, max);
  return (
    <div className="year-range">
      <div className="year-sliders">
        {/* One track for both handles; the span between them is an SVG rect, placed by
            geometry attributes, because inline styles are off limits (CSP). */}
        <svg
          className="year-track"
          viewBox={`0 0 ${String(STEPS)} 4`}
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <rect className="year-track-base" x="0" y="0" width={STEPS} height="4" />
          <rect className="year-track-fill" x={lo} y="0" width={Math.max(hi - lo, 0)} height="4" />
        </svg>
        <input
          type="range"
          // When both handles sit together in the upper half, the earliest-year one goes
          // on top so it can still be dragged left.
          className={lo >= hi && lo > STEPS / 2 ? 'year-slider year-slider-top' : 'year-slider'}
          aria-label="Earliest year"
          aria-valuetext={formatYear(from ?? min)}
          min={0}
          max={STEPS}
          value={lo}
          onChange={(e) => set(fromStep(Math.min(Number(e.target.value), hi)), to, true)}
        />
        <input
          type="range"
          className="year-slider"
          aria-label="Latest year"
          aria-valuetext={formatYear(to ?? max)}
          min={0}
          max={STEPS}
          value={hi}
          onChange={(e) => set(from, toStep(Math.max(Number(e.target.value), lo)), true)}
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
