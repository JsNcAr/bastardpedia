import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { formatYear } from '../format';
import { WIDTH, toX, type Domain } from './axis';
import { rangeFromDrag } from './brush';
import type { Bin } from './density';

const HEIGHT = 48;

/**
 * Stories per time bin, as a bar chart. Drag across it (or click a bar) to set
 * the year range; the existing year filter holds the result, so the chip, the
 * rail slider and "Clear all" stay in sync. Keyboard users have the slider and
 * the From / To fields in the filters.
 */
export function DensityStrip({
  bins,
  domain,
  onRange,
}: {
  bins: Bin[];
  domain: Domain;
  onRange: (from: number | null, to: number | null, live: boolean) => void;
}) {
  const svg = useRef<SVGSVGElement>(null);
  // The selection is only drawn while dragging and applied on release: the axis
  // follows the year filter, so applying it live would rescale under the pointer.
  const [drag, setDrag] = useState<{ x0: number; x1: number } | null>(null);
  const dragging = drag !== null;

  // Escape drops the drag. Capture phase, and the event is claimed, so the same
  // Escape doesn't also close the story pane.
  useEffect(() => {
    if (!dragging) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      setDrag(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [dragging]);
  const max = Math.max(1, ...bins.map((b) => b.count));
  const size = bins[0] ? bins[0].end - bins[0].start : 10;
  const unit = size === 1 ? 'year' : size === 10 ? 'decade' : `${String(size)} years`;
  const busiest = bins.reduce<Bin | null>((m, b) => (!m || b.count > m.count ? b : m), null);
  const summary =
    bins.length && busiest
      ? `Stories per ${unit}, ${formatYear(bins[0]?.start ?? domain.start)} to ${formatYear(domain.end)}. ` +
        `Busiest: ${formatYear(busiest.start)} to ${formatYear(busiest.end - 1)}, ${String(busiest.count)} stories.`
      : 'No stories to chart.';

  const xOf = (e: PointerEvent<SVGSVGElement>) => {
    const r = svg.current?.getBoundingClientRect();
    if (!r || r.width === 0) return 0;
    return ((e.clientX - r.left) / r.width) * WIDTH;
  };

  return (
    <div className="density">
      <svg
        ref={svg}
        className="density-chart"
        viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={summary}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const x = xOf(e);
          setDrag({ x0: x, x1: x });
        }}
        onPointerMove={(e) => {
          if (!drag) return;
          setDrag({ ...drag, x1: xOf(e) });
        }}
        onPointerUp={(e) => {
          if (!drag) return;
          const r = rangeFromDrag(drag.x0, xOf(e), domain, bins);
          setDrag(null);
          if (r) onRange(r.from, r.to, false);
        }}
        onPointerCancel={() => setDrag(null)}
      >
        {bins.map((b) => {
          const x = toX(Math.max(b.start, domain.start), domain);
          const w = Math.max(toX(Math.min(b.end, domain.end), domain) - x - 1, 0.5);
          const h = (b.count / max) * (HEIGHT - 2);
          return (
            <rect key={b.start} className="density-bar" x={x} y={HEIGHT - h} width={w} height={h}>
              <title>{`${formatYear(b.start)} to ${formatYear(b.end - 1)}: ${String(b.count)} stories`}</title>
            </rect>
          );
        })}
        {drag ? (
          <rect
            className="density-brush"
            x={Math.min(drag.x0, drag.x1)}
            y={0}
            width={Math.abs(drag.x1 - drag.x0)}
            height={HEIGHT}
          />
        ) : null}
      </svg>
      <p className="density-hint">Drag across the chart, or click a bar, to choose years.</p>
    </div>
  );
}
