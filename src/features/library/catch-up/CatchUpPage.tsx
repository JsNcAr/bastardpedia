import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { Catalog } from '@shared/schemas/catalog.ts';
import { useBulkStatus, useCatalog, useLibrary } from '@/app/queries';
import { DensityStrip } from '@/features/catalog/timeline/DensityStrip';
import { StateMessage } from '@/ui/StateMessage';
import { BulkResult, type BulkOutcome } from '../BulkResult';
import {
  byYear,
  changes,
  monthBins,
  monthLabel,
  monthRange,
  monthValue,
  oldestFirst,
  parseMonth,
  releaseBounds,
  released,
  storiesFor,
  ticksFor,
  totals,
  type Month,
  type Preset,
} from './catch-up-logic';
import { YearGroup } from './YearGroup';

const PRESETS: { id: Preset; label: string }[] = [
  { id: 'none', label: "Skip this: I'll tick stories myself" },
  { id: 'all', label: 'Everything so far' },
  { id: 'until', label: 'Everything up to a month' },
  { id: 'since', label: 'Everything since a month' },
  { id: 'between', label: 'Everything between two months' },
];

/**
 * Mark what you have heard in one pass, and come back later to add or fix: the
 * list starts with your listened stories ticked, release months (optional) add
 * ticks, the list adjusts them by year or story, and saving marks and unmarks
 * the difference, with Undo.
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
        Mark everything you have already heard in one go, or come back to add or fix marks. Stories
        you have listened to start ticked. Nothing is saved until you press Save, and you can undo
        it after.
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
  const all = useMemo(() => oldestFirst(catalog.stories), [catalog.stories]);
  const [preset, setPreset] = useState<Preset>('none');
  const [from, setFrom] = useState<Month>(first);
  const [to, setTo] = useState<Month>(last);
  // Unsaved ticks; null means "as saved", so the list follows the library.
  const [edits, setEdits] = useState<ReadonlySet<string> | null>(null);
  const [skip, setSkip] = useState<ReadonlySet<string>>(() => new Set());
  const [outcome, setOutcome] = useState<BulkOutcome | null>(null);
  const [saving, setSaving] = useState(false);

  const listened = useMemo(
    () => new Set((library.data ?? []).filter((e) => e.status === 'listened').map((e) => e.id)),
    [library.data],
  );
  const ticked = edits ?? listened;
  const bins = useMemo(
    () => monthBins(catalog.stories, first, last),
    [catalog.stories, first, last],
  );
  const formatCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of catalog.stories) counts.set(s.format, (counts.get(s.format) ?? 0) + 1);
    return counts;
  }, [catalog.stories]);

  /** Step 1: a release-date choice ticks the stories it covers, on top of what is listened. */
  const choose = (next: { preset: Preset; from: Month; to: Month }) => {
    setPreset(next.preset);
    setFrom(next.from);
    setTo(next.to);
    const covered = storiesFor(catalog.stories, { ...next, skipFormats: new Set() }, first, last);
    setEdits(ticksFor(listened, covered));
  };

  // Left-out formats are hidden from the list and neither marked nor unmarked.
  const shown = all.filter((s) => !skip.has(s.format));
  const { mark, unmark } = changes(shown, ticked, listened);
  const sum = totals(shown.filter((s) => ticked.has(s.id)));
  const pending = mark.length + unmark.length;

  const toggle = (ids: string[], on: boolean) =>
    setEdits((prev) => {
      const next = new Set(prev ?? listened);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const save = async () => {
    setSaving(true);
    try {
      const marked = mark.length ? await bulk.mutateAsync({ ids: mark, status: 'listened' }) : [];
      const cleared = unmark.length ? await bulk.mutateAsync({ ids: unmark, status: null }) : [];
      const parts = [
        mark.length ? `marked ${plural(mark.length)} as listened` : '',
        unmark.length ? `unmarked ${plural(unmark.length)}` : '',
      ].filter(Boolean);
      const text = parts.join(' and ');
      setOutcome({
        status: 'listened',
        snapshot: [...marked, ...cleared],
        message: `${text.charAt(0).toUpperCase()}${text.slice(1)}.`,
      });
      setEdits(null);
    } finally {
      setSaving(false);
    }
  };

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
          1. Tick by release date <span className="catch-optional">(optional)</span>
        </h2>
        <p className="catch-hint">
          Choosing here ticks the stories released in those months, on top of the ones you have
          already marked. Skip it to tick stories yourself.
        </p>
        <fieldset className="catch-presets">
          <legend className="visually-hidden">Release dates</legend>
          {PRESETS.map((p) => (
            <label key={p.id} className="facet-option">
              <input
                type="radio"
                name="catch-preset"
                checked={preset === p.id}
                onChange={() => choose({ preset: p.id, from, to })}
              />
              {p.label}
            </label>
          ))}
        </fieldset>
        {preset !== 'all' && preset !== 'none' ? (
          <div className="year-fields catch-months">
            {preset !== 'until'
              ? monthField('From', from, (m) => choose({ preset, from: m, to }))
              : null}
            {preset !== 'since'
              ? monthField(preset === 'until' ? 'Up to' : 'To', to, (m) =>
                  choose({ preset, from, to: m }),
                )
              : null}
          </div>
        ) : null}
        <DensityStrip
          bins={bins}
          domain={{ start: first, end: last + 1 }}
          format={monthLabel}
          unit="month"
          selection={monthRange({ preset, from, to, skipFormats: skip }, first, last) ?? undefined}
          hint="Stories released each month. Drag across the chart to tick the months you have heard."
          onRange={(a, b) => {
            if (a === null || b === null) return;
            choose({ preset: 'between', from: Math.max(a, first), to: Math.min(b, last) });
          }}
        />
      </section>

      <section className="catch-step" aria-labelledby="catch-check">
        <h2 id="catch-check" className="section-title">
          2. Check the list
        </h2>
        <p className="catch-summary" aria-live="polite">
          {sum.stories === 1 ? '1 story' : `${String(sum.stories)} stories`} ticked, {sum.episodes}{' '}
          {sum.episodes === 1 ? 'episode' : 'episodes'}, about {sum.hours}{' '}
          {sum.hours === 1 ? 'hour' : 'hours'}.
        </p>
        {shown.length === 0 ? (
          <p className="catch-empty">Every format is left out in step 3.</p>
        ) : (
          <div className="catch-years">
            {byYear(shown).map(([year, stories]) => (
              <YearGroup
                key={year}
                year={year}
                stories={stories}
                ticked={ticked}
                listened={listened}
                monthOf={(s) => monthLabel(released(s))}
                onToggle={toggle}
              />
            ))}
          </div>
        )}
      </section>

      <section className="catch-step" aria-labelledby="catch-formats">
        <h2 id="catch-formats" className="section-title">
          3. Leave out formats <span className="catch-optional">(optional)</span>
        </h2>
        <fieldset className="catch-formats">
          <legend className="catch-hint">
            Untick a format to hide its stories from the list. Saving leaves them as they are.
          </legend>
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

      <section className="catch-done" aria-label="Saved">
        <BulkResult outcome={outcome} onDismiss={() => setOutcome(null)} />
        {outcome ? (
          <p className="catch-next">
            <Link to="/?hide-listened=1">Browse with listened stories hidden</Link>
            <Link to="/library">See your library</Link>
          </p>
        ) : null}
        {bulk.isError ? (
          <p className="field-error" role="alert">
            Saving failed: your browser may be blocking site storage.
          </p>
        ) : null}
      </section>

      {/* Save stays in reach while the list scrolls. */}
      <div className="select-bar catch-save-bar" role="region" aria-label="Save changes">
        <p className="select-count" aria-live="polite">
          {pending === 0
            ? 'No changes yet'
            : [
                mark.length ? `${String(mark.length)} to mark` : '',
                unmark.length ? `${String(unmark.length)} to unmark` : '',
              ]
                .filter(Boolean)
                .join(', ')}
        </p>
        {edits ? (
          <button
            type="button"
            className="button button-compact button-quiet"
            onClick={() => {
              setEdits(null);
              setPreset('none');
            }}
          >
            Reset
          </button>
        ) : null}
        <button
          type="button"
          className="button button-compact button-primary catch-save"
          disabled={pending === 0 || saving || !library.isSuccess}
          onClick={() => void save()}
        >
          Save
        </button>
      </div>
    </>
  );
}

const plural = (n: number) => (n === 1 ? '1 story' : `${String(n)} stories`);
