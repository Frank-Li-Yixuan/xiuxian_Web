import { useMemo, useState, type ReactElement } from "react";

import {
  buildDevLifeStorylinesReport,
  DEV_LIFE_STORYLINE_SAMPLE_IDS,
  listDevLifeStorylineSamples,
  type DevLifeStorylineSampleId,
  type DevLifeStorylinesReport
} from "../../lifeStorylines/DevLifeStorylineDebugReport";
import { sanitizeLifeStorylinePublicText } from "../../lifeStorylines/LifeStorylinePublicSafety";

export interface DevLifeStorylinesScreenProps {
  readonly initialSampleId?: DevLifeStorylineSampleId;
  readonly report?: DevLifeStorylinesReport;
}

export function DevLifeStorylinesScreen({
  initialSampleId = "sample_alchemy_child",
  report: providedReport
}: DevLifeStorylinesScreenProps): ReactElement {
  const [selectedSampleId, setSelectedSampleId] = useState<DevLifeStorylineSampleId>(initialSampleId);
  const samples = listDevLifeStorylineSamples();
  const generatedReport = useMemo(
    () => buildDevLifeStorylinesReport(selectedSampleId),
    [selectedSampleId]
  );
  const report = providedReport ?? generatedReport;

  return (
    <main className="dev-life-storylines">
      <header className="dev-life-storylines__header">
        <h1>Life Storylines Debug</h1>
        <p>Debug-only LST scoring and event thread state. Exact scores and meters are not player-facing UI.</p>
        <label>
          Sample
          <select
            aria-label="Life storyline sample"
            value={providedReport === undefined ? selectedSampleId : report.sample.id}
            onChange={(event) => {
              const next = event.currentTarget.value;
              if (isDevLifeStorylineSampleId(next)) {
                setSelectedSampleId(next);
              }
            }}
          >
            {samples.map((sample) => (
              <option key={sample.id} value={sample.id}>
                {safeText(sample.label)} - {safeText(sample.summary)}
              </option>
            ))}
          </select>
        </label>
      </header>

      <section aria-label="Selected sample" className="dev-life-storylines__section">
        <h2>Selected Sample</h2>
        <p>
          <code>{safeText(report.sample.id)}</code> / {safeText(report.sample.label)}
        </p>
        <p>{safeText(report.sample.summary)}</p>
      </section>

      <section aria-label="activeStorylines" className="dev-life-storylines__section">
        <h2>activeStorylines</h2>
        <ul>
          {report.activeStorylines.map((storyline) => (
            <li key={storyline.storylineId}>
              <code>{safeText(storyline.storylineId)}</code>: score {storyline.score} / status{" "}
              <strong>{storyline.status}</strong> / updated month {storyline.lastUpdatedMonth}
            </li>
          ))}
        </ul>
      </section>

      <HookList title="downstreamActiveStorylineIds" hooks={report.downstreamActiveStorylineIds} />

      <section aria-label="score breakdown" className="dev-life-storylines__section">
        <h2>score breakdown</h2>
        {Object.entries(report.scoreBreakdownByStoryline).map(([storylineId, entries]) => (
          <article key={storylineId} className="dev-life-storylines__breakdown">
            <h3><code>{safeText(storylineId)}</code></h3>
            <ul>
              {entries.map((entry, index) => (
                <li key={`${storylineId}-${entry.source}-${index}`}>
                  <code>{safeText(entry.source)}</code>: {entry.weight}
                  {entry.note === undefined ? null : <> / {safeText(entry.note)}</>}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section aria-label="eventThreads" className="dev-life-storylines__section">
        <h2>eventThreads</h2>
        <ul>
          {report.eventThreads.map((thread) => (
            <li key={thread.threadId}>
              <code>{safeText(thread.threadId)}</code> / <code>{safeText(thread.storylineId)}</code> /{" "}
              <strong>{thread.stage}</strong>
              <dl>
                <MeterRow label="progress" value={thread.progress} />
                <MeterRow label="tension" value={thread.tension} />
                <MeterRow label="clarity" value={thread.clarity} />
                <MeterRow label="risk" value={thread.risk} />
              </dl>
            </li>
          ))}
        </ul>
      </section>

      <HookList title="playInterludeCandidateHooks" hooks={report.playInterludeCandidateHooks} />
      <HookList title="transitionCandidateHooks" hooks={report.transitionCandidateHooks} />

      <section aria-label="Debug metadata" className="dev-life-storylines__section">
        <h2>Debug Metadata</h2>
        <p>trueNameRevealed: {String(report.safety.trueNameRevealed)}</p>
        <p>Selected threads: {formatInlineList(report.debug.selectedThreads)}</p>
        <p>Public signal tags: {formatInlineList(report.debug.signalTags)}</p>
      </section>
    </main>
  );
}

function MeterRow({ label, value }: { readonly label: string; readonly value: number }): ReactElement {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function HookList({ title, hooks }: { readonly title: string; readonly hooks: readonly string[] }): ReactElement {
  return (
    <section aria-label={title} className="dev-life-storylines__section">
      <h2>{title}</h2>
      <ul>
        {hooks.length === 0 ? (
          <li>none</li>
        ) : (
          hooks.map((hook) => <li key={hook}><code>{safeText(hook)}</code></li>)
        )}
      </ul>
    </section>
  );
}

function formatInlineList(values: readonly string[]): string {
  return values.map(safeText).join(", ") || "none";
}

function isDevLifeStorylineSampleId(value: string): value is DevLifeStorylineSampleId {
  return (DEV_LIFE_STORYLINE_SAMPLE_IDS as readonly string[]).includes(value);
}

function safeText(value: string): string {
  return sanitizeLifeStorylinePublicText(value);
}
