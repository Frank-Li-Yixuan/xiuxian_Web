import type { ReactElement } from "react";

import {
  buildOriginFateV02DistributionTelemetry,
  type OriginFateV02DistributionBucket,
  type OriginFateV02DistributionTelemetryReport,
  type OriginFateV02PresetProbe
} from "../../originFate/OriginFateV02DistributionTelemetry";

export interface DevOriginFateDebugScreenProps {
  readonly report?: OriginFateV02DistributionTelemetryReport;
  readonly sampleCount?: number;
  readonly debugSampleCount?: number;
  readonly seedPrefix?: string;
}

export function DevOriginFateDebugScreen({
  report: providedReport,
  sampleCount = 128,
  debugSampleCount = 3,
  seedPrefix = "dev-origin-fate-debug"
}: DevOriginFateDebugScreenProps): ReactElement {
  const report = providedReport ?? buildOriginFateV02DistributionTelemetry({
    sampleCount,
    debugSampleCount,
    seedPrefix
  });
  const firstProbe = report.presetProbes.apothecaryAlchemy;

  return (
    <main className="dev-origin-fate-debug">
      <header className="dev-origin-fate-debug__header">
        <h1>Origin Fate v0.2 Debug</h1>
        <p>Debug-only HFO v0.2 telemetry and public-view safety comparison.</p>
      </header>

      <section aria-label="Distribution summary" className="dev-origin-fate-debug__section">
        <h2>Distribution Summary</h2>
        <dl>
          <div>
            <dt>Sample count</dt>
            <dd>{report.sampleCount}</dd>
          </div>
          <div>
            <dt>Seed prefix</dt>
            <dd>{report.seedPrefix}</dd>
          </div>
          <div>
            <dt>Public leak count</dt>
            <dd>{report.hiddenLeakScan.leakCount}</dd>
          </div>
        </dl>
      </section>

      <section aria-label="Hidden fate rarity" className="dev-origin-fate-debug__section">
        <h2>Hidden Fate Rarity</h2>
        <DistributionList distribution={report.hiddenFateRarityDistribution} />
      </section>

      <section aria-label="Origin synergy" className="dev-origin-fate-debug__section">
        <h2>Origin-Hidden Synergy</h2>
        <DistributionList distribution={report.originHiddenSynergyCountsById} />
        <h2>Origin-Item Synergy</h2>
        <DistributionList distribution={report.originItemSynergyCountsById} />
      </section>

      <section aria-label="Preset probes" className="dev-origin-fate-debug__section">
        <h2>Preset Probes</h2>
        <ul>
          {Object.entries(report.presetProbes).map(([key, probe]) => (
            <li key={key}>
              <code>{key}</code>: {probe.passed ? "pass" : "fail"} / <code>{probe.originId}</code> /{" "}
              <code>{probe.itemId}</code> / <code>{probe.hiddenFateId}</code>
            </li>
          ))}
        </ul>
      </section>

      <PublicSafetyPanel probe={firstProbe} />
      <InternalNamePanel probes={Object.values(report.presetProbes)} />
    </main>
  );
}

function PublicSafetyPanel({ probe }: { readonly probe: OriginFateV02PresetProbe }): ReactElement {
  return (
    <>
      <section aria-label="Public omen view comparison" className="dev-origin-fate-debug__section">
        <h2>Public Omen View Comparison</h2>
        <p>
          <code>{probe.publicOmenView.surface}</code> / band {probe.publicOmenView.revealBand ?? "hidden"}
        </p>
        <ul>
          {probe.publicOmenView.omenLines.map((line, index) => (
            <li key={`${line}-${index}`}>{line}</li>
          ))}
        </ul>
      </section>

      <section aria-label="Monthly log safety preview" className="dev-origin-fate-debug__section">
        <h2>Monthly Log Safety Preview</h2>
        <ul>
          {probe.monthlyLogPreview.map((line, index) => (
            <li key={`${line}-${index}`}>{line}</li>
          ))}
        </ul>
      </section>

      <section aria-label="Major choice safety preview" className="dev-origin-fate-debug__section">
        <h2>Major Choice Safety Preview</h2>
        <p>Hidden hints: {probe.majorChoicePreview.hiddenFateHintTags.join(", ") || "none"}</p>
        <p>Carried item hints: {probe.majorChoicePreview.carriedItemTags.join(", ") || "none"}</p>
      </section>

      <section aria-label="Age-18 conversion preview" className="dev-origin-fate-debug__section">
        <h2>Age-18 Conversion Preview</h2>
        <p>Converted items: {probe.age18Preview.convertedCarriedItems.map((item) => item.itemId).join(", ") || "none"}</p>
        <p>Dongfu hooks: {probe.age18Preview.dongfuHooks.join(", ") || "none"}</p>
      </section>
    </>
  );
}

function InternalNamePanel({ probes }: { readonly probes: readonly OriginFateV02PresetProbe[] }): ReactElement {
  return (
    <section aria-label="Dev-only internal names" className="dev-origin-fate-debug__section dev-origin-fate-debug__section--internal">
      <h2>Dev-only Internal Names</h2>
      <ul>
        {probes.flatMap((probe) =>
          probe.internalTrueNames.map((name) => (
            <li key={`${probe.hiddenFateId}-${name}`}>
              <code>{probe.hiddenFateId}</code>: {name}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

function DistributionList({
  distribution
}: {
  readonly distribution: Readonly<Record<string, OriginFateV02DistributionBucket>>;
}): ReactElement {
  const entries = Object.entries(distribution).sort(
    (first, second) => second[1].count - first[1].count || first[0].localeCompare(second[0])
  );
  return (
    <ul>
      {entries.length === 0 ? (
        <li>none</li>
      ) : (
        entries.map(([id, bucket]) => (
          <li key={id}>
            <code>{id}</code>: {bucket.count} / {formatRate(bucket.rate)}
          </li>
        ))
      )}
    </ul>
  );
}

function formatRate(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}
