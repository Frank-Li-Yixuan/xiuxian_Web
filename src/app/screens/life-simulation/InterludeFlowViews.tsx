import type { ReactElement } from "react";
import { motion, useReducedMotion } from "motion/react";

import type { PendingLifeInterludeState } from "../../../types/life-monthly-events-types.v0.1";
import { XianxiaButton, XianxiaDialog } from "../../ui-system";
import {
  sanitizeLifeInterludeUiText,
  type LifeInterludeUiResolutionMode,
  type LifeInterludeUiResultSummary
} from "./LifeInterludeUiViewModel";

export interface InterludeConfirmDialogProps {
  readonly onBeginResolution?: (resolutionMode: LifeInterludeUiResolutionMode) => void;
  readonly onBackToChoice?: () => void;
  readonly open: boolean;
  readonly pendingInterlude: PendingLifeInterludeState;
}

export interface InterludeTransitionScreenProps {
  readonly onBackToChoice?: (() => void) | undefined;
  readonly onResolve?: (() => void) | undefined;
  readonly pendingInterlude: PendingLifeInterludeState;
  readonly resolutionMode: LifeInterludeUiResolutionMode;
}

export interface InterludeResultPanelProps {
  readonly onReturn?: (() => void) | undefined;
  readonly summary: LifeInterludeUiResultSummary;
}

export function InterludeConfirmDialog({
  onBackToChoice,
  onBeginResolution,
  open,
  pendingInterlude
}: InterludeConfirmDialogProps): ReactElement {
  const candidate = pendingInterlude.candidate;
  const runConfig = pendingInterlude.runConfig;
  const duration = sanitizeLifeInterludeUiText(candidate.durationPreview ?? `${runConfig.turnLimit ?? 0} turns`);
  const title = sanitizeLifeInterludeUiText(candidate.name);
  return (
    <>
      <div
        aria-hidden="true"
        className="life-interlude-confirm-marker"
        data-life-interlude-confirm-dialog="true"
        data-pending-life-interlude={sanitizeLifeInterludeUiText(runConfig.interludeRunId)}
        data-result-writeback-id={sanitizeLifeInterludeUiText(runConfig.resultWritebackId)}
      >
        <span>{sanitizeLifeInterludeUiText(runConfig.definitionId)}</span>
        <span>{sanitizeLifeInterludeUiText(runConfig.mode)}</span>
        <span>{sanitizeLifeInterludeUiText(candidate.displayRisk)}</span>
        <span>{duration}</span>
        <span data-interlude-confirm-action="manualChallenge" />
        <span data-interlude-confirm-action="autoResolve" />
        <span data-interlude-confirm-action="backToChoice" />
      </div>
      <XianxiaDialog
        className="life-interlude-confirm-dialog"
        description={sanitizeLifeInterludeUiText(runConfig.scenario.worldExplanation)}
        open={open}
        title={title}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            onBackToChoice?.();
          }
        }}
        actions={(
          <>
            <XianxiaButton
              data-interlude-confirm-action="manualChallenge"
              variant="primary"
              onClick={() => onBeginResolution?.("manualChallenge")}
            >
              Manual challenge
            </XianxiaButton>
            <XianxiaButton
              data-interlude-confirm-action="autoResolve"
              variant="secondary"
              onClick={() => onBeginResolution?.("autoResolve")}
            >
              Auto resolve
            </XianxiaButton>
            <XianxiaButton
              data-interlude-confirm-action="backToChoice"
              variant="ghost"
              onClick={() => onBackToChoice?.()}
            >
              Back to choice
            </XianxiaButton>
          </>
        )}
      >
        <div className="life-interlude-confirm-body">
          <dl className="life-interlude-fact-grid">
            <div>
              <dt>Definition</dt>
              <dd>{sanitizeLifeInterludeUiText(runConfig.definitionId)}</dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>{sanitizeLifeInterludeUiText(runConfig.mode)}</dd>
            </div>
            <div>
              <dt>Risk</dt>
              <dd>{sanitizeLifeInterludeUiText(candidate.displayRisk)}</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>{duration}</dd>
            </div>
          </dl>
          <p className="life-interlude-public-copy">{sanitizeLifeInterludeUiText(candidate.worldExplanation)}</p>
        </div>
      </XianxiaDialog>
    </>
  );
}

export function InterludeTransitionScreen({
  onBackToChoice,
  onResolve,
  pendingInterlude,
  resolutionMode
}: InterludeTransitionScreenProps): ReactElement {
  const shouldReduceMotion = useReducedMotion();
  const candidate = pendingInterlude.candidate;
  const runConfig = pendingInterlude.runConfig;
  const sourceThreadId = sanitizeLifeInterludeUiText(runConfig.sourceThreadId ?? pendingInterlude.sourceOptionInstanceId);
  const motionProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.24 }
      };

  return (
    <motion.div
      className="life-interlude-transition"
      data-life-interlude-transition={resolutionMode}
      data-life-interlude-transition-mode={sanitizeLifeInterludeUiText(runConfig.mode)}
      data-life-interlude-transition-risk={sanitizeLifeInterludeUiText(candidate.displayRisk)}
      data-life-interlude-transition-source={sourceThreadId}
      {...motionProps}
    >
      <span className="life-interlude-seal" aria-hidden="true" />
      <p className="life-interlude-eyebrow">Possible trial</p>
      <h2>{sanitizeLifeInterludeUiText(runConfig.scenario.title)}</h2>
      <p className="life-interlude-public-copy">{sanitizeLifeInterludeUiText(runConfig.scenario.worldExplanation)}</p>
      <dl className="life-interlude-fact-grid">
        <div>
          <dt>Mode</dt>
          <dd>{sanitizeLifeInterludeUiText(runConfig.mode)}</dd>
        </div>
        <div>
          <dt>Risk</dt>
          <dd>{sanitizeLifeInterludeUiText(candidate.displayRisk)}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{sourceThreadId}</dd>
        </div>
      </dl>
      <div className="life-interlude-transition-actions">
        <XianxiaButton
          className="life-interlude-primary-action"
          data-life-interlude-transition-action="resolve"
          variant="primary"
          onClick={onResolve ?? noop}
        >
          {resolutionMode === "manualChallenge" ? "Enter placeholder challenge" : "Complete auto resolve"}
        </XianxiaButton>
        <button className="life-interlude-text-action" type="button" onClick={onBackToChoice}>
          Back to choice
        </button>
      </div>
    </motion.div>
  );
}

export function InterludeResultPanel({ onReturn, summary }: InterludeResultPanelProps): ReactElement {
  const shouldReduceMotion = useReducedMotion();
  const motionProps = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.22 }
      };

  return (
    <motion.div
      className="life-interlude-result-panel"
      data-life-interlude-result-outcome={sanitizeLifeInterludeUiText(summary.outcome)}
      data-life-interlude-result-panel="true"
      {...motionProps}
    >
      <p className="life-interlude-eyebrow">Interlude complete</p>
      <h2>{summary.title}</h2>
      <p className="life-interlude-result-status">
        {sanitizeLifeInterludeUiText(summary.mode)} / {sanitizeLifeInterludeUiText(summary.outcome)} / {summary.resolutionMode}
      </p>
      <ResultList title="Visible log" values={summary.visibleLogs} fallback="No visible log changes." />
      <ResultList title="State changes" values={summary.statChanges} fallback="No public stat changes." />
      <ResultList title="Wounds" values={summary.woundChanges} fallback="No wound changes." />
      <ResultList title="Heart knots" values={summary.heartKnotChanges} fallback="No heart-knot changes." />
      <ResultList title="Hook hints" values={summary.hookHints} fallback="No public hook hints." />
      <XianxiaButton
        className="life-interlude-primary-action"
        data-life-interlude-result-action="return"
        variant="primary"
        onClick={onReturn ?? noop}
      >
        Return to life record
      </XianxiaButton>
    </motion.div>
  );
}

function noop(): void {
  // Optional callbacks are absent in SSR-focused tests.
}

function ResultList({
  fallback,
  title,
  values
}: {
  readonly fallback: string;
  readonly title: string;
  readonly values: readonly string[];
}): ReactElement {
  return (
    <section className="life-interlude-result-section">
      <h3>{title}</h3>
      {values.length === 0 ? (
        <p>{fallback}</p>
      ) : (
        <ul>
          {values.map((value) => (
            <li key={value}>{sanitizeLifeInterludeUiText(value)}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
