import type { ReactElement } from "react";

import {
  buildNinePalaceDistributionTelemetry,
  type NinePalaceDistributionTelemetryReport,
  type NinePalaceNumericDistribution,
  type NinePalaceTelemetryDebugSample
} from "../../ninePalace/NinePalaceDistributionTelemetry";

export interface DevFateMatrixScreenProps {
  readonly report?: NinePalaceDistributionTelemetryReport;
  readonly sampleCount?: number;
  readonly debugSampleCount?: number;
  readonly seedPrefix?: string;
}

export function DevFateMatrixScreen({
  report: providedReport,
  sampleCount = 128,
  debugSampleCount = 3,
  seedPrefix = "dev-fate-matrix"
}: DevFateMatrixScreenProps): ReactElement {
  const report = providedReport ?? buildNinePalaceDistributionTelemetry({
    sampleCount,
    debugSampleCount,
    seedPrefix
  });
  const primarySample = report.debugSamples[0];

  return (
    <main className="dev-fate-matrix">
      <header className="dev-fate-matrix__header">
        <h1>Fate Matrix Debug</h1>
        <p>Debug-only Nine Palace and Destiny v2 telemetry. This route is not part of the player-facing flow.</p>
      </header>

      <section aria-label="Distribution summary" className="dev-fate-matrix__section">
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
            <dt>Mutation Destiny Appearance Rate</dt>
            <dd>{formatRate(report.mutationAppearance.rate)}</dd>
          </div>
          <div>
            <dt>Anti-weirdness violations</dt>
            <dd>{report.antiWeirdnessViolationCount}</dd>
          </div>
        </dl>
      </section>

      <section aria-label="Target sample distributions" className="dev-fate-matrix__section">
        <h2>Target Sample Distributions</h2>
        <DistributionLine
          label="Heaven-Jealous Talent talentScore"
          primary={report.targetSamples.heavenJealousTalent.talentScore}
          sampleCount={report.targetSamples.heavenJealousTalent.sampleCount}
        />
        <DistributionLine
          label="Waste-Root Reversal rootBone/heart"
          primary={report.targetSamples.wasteRootReversal.rootBone}
          sampleCount={report.targetSamples.wasteRootReversal.sampleCount}
          secondary={report.targetSamples.wasteRootReversal.heart}
        />
        <DistributionLine
          label="Cowardly Supreme heart/lifespan"
          primary={report.targetSamples.cowardlySupreme.heart}
          sampleCount={report.targetSamples.cowardlySupreme.sampleCount}
          secondary={report.targetSamples.cowardlySupreme.lifespan}
        />
      </section>

      {primarySample === undefined ? null : <DebugSamplePanel sample={primarySample} />}

      <section aria-label="Mutation counts" className="dev-fate-matrix__section">
        <h2>Mutation Reasons</h2>
        <ul>
          {Object.entries(report.mutationCountsById).map(([id, bucket]) => (
            <li key={id}>
              <code>{id}</code>: {bucket.count} / {formatRate(bucket.rate)}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function DebugSamplePanel({ sample }: { readonly sample: NinePalaceTelemetryDebugSample }): ReactElement {
  return (
    <section aria-label="Debug sample" className="dev-fate-matrix__section">
      <h2>Debug Sample</h2>
      <p>
        <code>{sample.seed}</code> / <code>{sample.draftId}</code>
      </p>

      <h3>Three Powers</h3>
      <ScoreList values={sample.threePowers} />

      <h3>Derived Scores</h3>
      <ScoreList values={sample.derivedScores} />

      <h3>Final Destinies</h3>
      <ul>
        {sample.finalDestinyIds.map((id) => (
          <li key={id}><code>{id}</code></li>
        ))}
      </ul>

      <h3>Destiny Eligibility Explanation</h3>
      <ul>
        {sample.eligibilityExplanations.map((item, index) => (
          <li key={`${item}-${index}`}><code>{item}</code></li>
        ))}
      </ul>

      <h3>Mutation Reasons</h3>
      <ul>
        {sample.mutationReasons.map((item, index) => (
          <li key={`${item}-${index}`}><code>{item}</code></li>
        ))}
      </ul>

      <h3>Conflict / Synergy</h3>
      <p>Warnings: {sample.conflictSynergy.warnings.length}</p>
      <p>Synergy tags: {sample.conflictSynergy.synergyTags.join(", ") || "none"}</p>
    </section>
  );
}

function DistributionLine({
  label,
  sampleCount,
  primary,
  secondary
}: {
  readonly label: string;
  readonly sampleCount: number;
  readonly primary: NinePalaceNumericDistribution | undefined;
  readonly secondary?: NinePalaceNumericDistribution | undefined;
}): ReactElement {
  return (
    <article className="dev-fate-matrix__distribution">
      <h3>{label}</h3>
      <p>Samples: {sampleCount}</p>
      <p>{primary === undefined ? "n/a" : formatDistribution(primary)}</p>
      {secondary === undefined ? null : <p>{formatDistribution(secondary)}</p>}
    </article>
  );
}

function ScoreList<T extends object>({ values }: { readonly values: T }): ReactElement {
  return (
    <dl>
      {Object.entries(values as Record<string, number>).map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatDistribution(distribution: NinePalaceNumericDistribution): string {
  return `count=${distribution.count} min=${distribution.min} max=${distribution.max} mean=${distribution.mean}`;
}

function formatRate(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}
