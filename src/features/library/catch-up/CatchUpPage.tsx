import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { Catalog } from '@shared/schemas/catalog.ts';
import { useBulkStatus, useCatalog, useLibrary } from '@/app/queries';
import { DensityStrip } from '@/features/catalog/timeline/DensityStrip';
import { StateMessage } from '@/ui/StateMessage';
import { BulkResult, type BulkOutcome } from '../BulkResult';
import {
  byYear,
  monthBins,
  monthLabel,
  monthRange,
  monthValue,
  parseMonth,
  releaseBounds,
  released,
  storiesFor,
  totals,
  type Month,
  type Preset,
} from './catch-up-logic';
import { YearGroup } from './YearGroup';

const PRESETS: { id: Preset; label: string }[] = [
  { id: 'all', label: 'Everything so far' },
  { id: 'until', label: 'Everything up to a month' },
  { id: 'since', label: 'Everything since a month' },
  { id: 'between', label: 'Everything between two months' },
];

/**
 * A first pass for longtime listeners: pick the release months you have heard,
 * leave out formats you skip, untick the exceptions, and mark the rest listened
 * in one go, with Undo.
 */
export function CatchUpPage() {
  const catalog = useCatalog();
  return (
    <div className="page page-narrow catch-up">
      <p>
        <Link to="/library">Your library</Link>
      </p>
      <h1 className="page-title">Catch up</h1>
      <p className="page-lead">
        Mark everything you have already heard in one go. You can untick the exceptions before
        anything is saved, and undo it after.
      </p>
      {catalog.isPending ? (
        <StateMessage icon="library" title="Loading the catalogue" busy role="status" />
      ) : catalog.isError ? (
        <StateMessage icon="triangle-alert" title="The catalogue could not be loaded" role="alert">
          <p>{catalog.error.message}</p>
        </StateMessage>
      ) : (
        <CatchUp catalog={catalog.data} />
      )}
    </div>
  );
}

function CatchUp({ catalog }: { catalog: Catalog }) {
  const library = useLibrary();
  const bulk = useBulkStatus();
  const { first, last } = useMemo(() => releaseBounds(catalog.stories), [catalog.stories]);
  const [preset, setPreset] = useState<Preset>('all');
  const [from, setFrom] = useState<Month>(first);
  const [to, setTo] = useState<Month>(last);
  const [skip, setSkip] = useState<ReadonlySet<string>>(() => new Set());
  const [unticked, setUnticked] = useState<ReadonlySet<string>>(() => new Set());
  const [outcome, setOutcome] = useState<BulkOutcome | null>(null);

  const listened = useMemo(
    () => new Set((library.data ?? []).filter((e) => e.status === 'listened').map((e) => e.id)),
    [library.data],
  );
  const bins = useMemo(
    () => monthBins(catalog.stories, first, last),
    [catalog.stories, first, last],
  );
  const chosen = useMemo(
    () => storiesFor(catalog.stories, { preset, from, to, skipFormats: skip }, first, last),
    [catalog.stories, preset, from, to, skip, first, last],
  );
  // Format counts within the chosen months, before any format is left out.
  const formatCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of storiesFor(
      catalog.stories,
      { preset, from, to, skipFormats: new Set() },
      first,
      last,
    ))
      counts.set(s.format, (counts.get(s.format) ?? 0) + 1);
    return counts;
  }, [catalog.stories, preset, from, to, first, last]);

  const ticked = chosen.filter((s) => !unticked.has(s.id));
  const toMark = ticked.filter((s) => !listened.has(s.id));
  const sum = totals(ticked);
  const already = ticked.length - toMark.length;

  const toggle = (ids: string[], on: boolean) =>
    setUnticked((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.delete(id);
        else next.add(id);
      }
      return next;
    });

  const monthField = (label: string, value: Month, set: (m: Month) => void) => (
    <label className="year-field">
      {label}
      <input
        className="year-input"
        type="month"
        min={monthValue(first)}
        max={monthValue(last)}
        value={monthValue(value)}
        onChange={(e) => {
          const m = parseMonth(e.currentTarget.value);
          if (m !== null) set(Math.min(Math.max(m, first), last));
        }}
      />
    </label>
  );

  return (
    <>
      <section className="catch-step" aria-labelledby="catch-heard">
        <h2 id="catch-heard" className="section-title">
          1. What have you heard?
        </h2>
        <fieldset className="catch-presets">
          <legend className="visually-hidden">Release dates</legend>
          {PRESETS.map((p) => (
            <label key={p.id} className="facet-option">
              <input
                type="radio"
                name="catch-preset"
                checked={preset === p.id}
                onChange={() => setPreset(p.id)}
              />
              {p.label}
            </label>
          ))}
        </fieldset>
        {preset !== 'all' ? (
          <div className="year-fields catch-months">
            {preset !== 'until' ? monthField('From', from, setFrom) : null}
            {preset !== 'since' ? monthField(preset === 'until' ? 'Up to' : 'To', to, setTo) : null}
          </div>
        ) : null}
        <DensityStrip
          bins={bins}
          domain={{ start: first, end: last + 1 }}
          format={monthLabel}
          unit="month"
          selection={monthRange({ preset, from, to, skipFormats: skip }, first, last)}
          hint="Stories released each month. Drag across the chart to pick the months you have heard."
          onRange={(a, b) => {
            if (a === null || b === null) return;
            setPreset('between');
            setFrom(Math.max(a, first));
            setTo(Math.min(b, last));
          }}
        />
        <fieldset className="catch-formats">
          <legend className="field-label">Formats</legend>
          {catalog.vocab.formats
            .filter((f) => formatCounts.has(f.id))
            .map((f) => (
              <label key={f.id} className="facet-option">
                <input
                  type="checkbox"
                  checked={!skip.has(f.id)}
                  onChange={(e) => {
                    const on = e.currentTarget.checked;
                    setSkip((prev) => {
                      const next = new Set(prev);
                      if (on) next.delete(f.id);
                      else next.add(f.id);
                      return next;
                    });
                  }}
                />
                <span className="facet-option-label">{f.label}</span>
                <span className="facet-option-count">{formatCounts.get(f.id)}</span>
              </label>
            ))}
        </fieldset>
      </section>

      <section className="catch-step" aria-labelledby="catch-check">
        <h2 id="catch-check" className="section-title">
          2. Check the list
        </h2>
        <p className="catch-summary" aria-live="polite">
          {sum.stories === 1 ? '1 story' : `${String(sum.stories)} stories`}, {sum.episodes}{' '}
          {sum.episodes === 1 ? 'episode' : 'episodes'}, about {sum.hours}{' '}
          {sum.hours === 1 ? 'hour' : 'hours'}
          {already > 0 ? `. ${String(already)} already marked listened.` : '.'}
        </p>
        {chosen.length === 0 ? (
          <p className="catch-empty">No stories were released in those months.</p>
        ) : (
          <div className="catch-years">
            {byYear(chosen).map(([year, stories]) => (
              <YearGroup
                key={year}
                year={year}
                stories={stories}
                unticked={unticked}
                listened={listened}
                monthOf={(s) => monthLabel(released(s))}
                onToggle={toggle}
              />
            ))}
          </div>
        )}
      </section>

      <section className="catch-step" aria-labelledby="catch-confirm">
        <h2 id="catch-confirm" className="section-title">
          3. Save
        </h2>
        <button
          type="button"
          className="button button-primary"
          disabled={toMark.length === 0 || bulk.isPending || !library.isSuccess}
          onClick={() => {
            const ids = toMark.map((s) => s.id);
            bulk.mutate(
              { ids, status: 'listened' },
              { onSuccess: (snapshot) => setOutcome({ status: 'listened', snapshot }) },
            );
          }}
        >
          {toMark.length === 1
            ? 'Mark 1 story as listened'
            : `Mark ${String(toMark.length)} stories as listened`}
        </button>
        {bulk.isError ? (
          <p className="field-error" role="alert">
            Saving failed: your browser may be blocking site storage.
          </p>
        ) : null}
        <BulkResult outcome={outcome} onDismiss={() => setOutcome(null)} />
        {outcome ? (
          <p className="catch-next">
            <Link to="/?hide-listened=1">Browse with listened stories hidden</Link>
            <Link to="/library">See your library</Link>
          </p>
        ) : null}
      </section>
    </>
  );
}
