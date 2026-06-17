import type { ReactElement } from "react";

import type { OutgameProfileState } from "../../outgame/ProfileState";
import type { LifeSimulationState } from "../../types/life-monthly-events-types.v0.1";
import type { MajorChoiceOptionInstance } from "../../types/major-life-choice-types.v0.1";
import {
  InterludeConfirmDialog,
  InterludeResultPanel,
  InterludeTransitionScreen
} from "./life-simulation/InterludeFlowViews";
import type {
  LifeInterludeUiResolutionMode,
  LifeInterludeUiResultSummary
} from "./life-simulation/LifeInterludeUiViewModel";

export interface LifeSimulationScreenProps {
  readonly interludeResolutionMode?: LifeInterludeUiResolutionMode;
  readonly interludeResultSummary?: LifeInterludeUiResultSummary;
  readonly interludeUiPhase?: "confirm" | "transition" | "result";
  readonly lifeSimulationState?: LifeSimulationState;
  readonly onBeginInterludeResolution?: (resolutionMode: LifeInterludeUiResolutionMode) => void;
  readonly onChoice?: (choiceId: string) => void;
  readonly onClearInterludeResult?: () => void;
  readonly onConfirmInterludeResolution?: () => void;
  readonly onResolveInterlude?: (resolutionMode: "autoResolve" | "manualChallenge" | "backToChoice") => void;
  readonly profile?: OutgameProfileState;
}

const timelineAges = ["0", "3", "6", "9", "12", "15", "18"] as const;
const choiceIds = ["study", "train", "wander"] as const;

export function LifeSimulationScreen({
  interludeResolutionMode = "manualChallenge",
  interludeResultSummary,
  interludeUiPhase,
  lifeSimulationState,
  onBeginInterludeResolution,
  onChoice,
  onClearInterludeResult,
  onConfirmInterludeResolution,
  onResolveInterlude,
  profile
}: LifeSimulationScreenProps): ReactElement {
  const characterName = profile?.characterName ?? profile?.characterOrigin?.name ?? "未定道友";
  const stage = profile?.stage ?? "unknown";
  const ageMonths = lifeSimulationState?.ageMonths ?? 0;
  const phaseId = lifeSimulationState?.phaseId ?? "infancy";
  const pendingMajorChoice = lifeSimulationState?.pendingMajorChoiceState;
  const pendingInterlude = lifeSimulationState?.pendingInterlude;
  const choiceOptions = pendingMajorChoice?.options ?? [];
  const effectiveInterludeUiPhase = interludeResultSummary !== undefined && interludeUiPhase === "result"
    ? "result"
    : pendingInterlude === undefined
      ? "choice"
      : interludeUiPhase ?? "confirm";

  return (
    <section
      className="life-simulation-screen"
      data-life-simulation-stage={stage}
      data-testid="life-simulation-screen"
    >
      <div className="life-simulation-layout">
        <aside className="life-timeline-vertical" aria-label="life timeline">
          <span className="life-timeline-thread" aria-hidden="true" />
          {timelineAges.map((age) => (
            <span key={age} className="life-timeline-mark">
              <span>{age}</span>
            </span>
          ))}
        </aside>

        <section className="life-event-log-panel">
          <span className="life-panel-ornament" aria-hidden="true" />
          <h1>命途纪事</h1>
          <p data-life-simulation-character="true">角色：{characterName}</p>
          <p data-life-simulation-initial-state="true">
            初始状态：{Math.floor(ageMonths / 12)}岁 / {ageMonths}月 / {phaseId}
          </p>
          {lifeSimulationState === undefined ? null : (
            <p data-life-simulation-core="true">
              精 {lifeSimulationState.core.jing} / 气 {lifeSimulationState.core.qi} / 神 {lifeSimulationState.core.shen}
            </p>
          )}
          <p>月度事件、家族因果、血脉异兆与天命变化将在这里记录。</p>
          <div className="life-log-lines" aria-hidden="true">
            {Array.from({ length: 8 }, (_, index) => (
              <span key={index} />
            ))}
          </div>
        </section>

        <section className={`life-choice-event-card ${effectiveInterludeUiPhase === "result" ? "has-interlude-result" : ""}`}>
          <span className="life-panel-ornament" aria-hidden="true" />
          {effectiveInterludeUiPhase === "choice" || effectiveInterludeUiPhase === "confirm" ? (
            <>
              <h2>命运分岔</h2>
              <p data-pending-major-choice={pendingMajorChoice?.eventInstanceId}>
                {pendingMajorChoice?.description ?? "半岁大事描述区域。玩家将在多个选择之间决定童年与少年命途。"}
              </p>
              <div className="life-choice-actions">
                {(choiceOptions.length > 0 ? choiceOptions : choiceIds).map((choice, index) => {
                  const option = typeof choice === "string" ? undefined : choice;
                  const choiceId = option?.instanceId ?? choice as string;
                  return (
                    <button
                      key={choiceId}
                      className="life-choice-button"
                      disabled={option?.disabledReason !== undefined}
                      type="button"
                      onClick={() => onChoice?.(choiceId)}
                    >
                      {option === undefined ? `抉择 ${index + 1}` : renderChoiceOption(option, index)}
                    </button>
                  );
                })}
              </div>
              {pendingInterlude === undefined ? null : (
                <InterludeConfirmDialog
                  open={effectiveInterludeUiPhase === "confirm"}
                  pendingInterlude={pendingInterlude}
                  onBackToChoice={() => onResolveInterlude?.("backToChoice")}
                  onBeginResolution={(resolutionMode) => {
                    if (onBeginInterludeResolution === undefined) {
                      onResolveInterlude?.(resolutionMode);
                      return;
                    }
                    onBeginInterludeResolution(resolutionMode);
                  }}
                />
              )}
            </>
          ) : effectiveInterludeUiPhase === "transition" && pendingInterlude !== undefined ? (
            <InterludeTransitionScreen
              pendingInterlude={pendingInterlude}
              resolutionMode={interludeResolutionMode}
              onBackToChoice={() => onResolveInterlude?.("backToChoice")}
              onResolve={() => {
                if (onConfirmInterludeResolution === undefined) {
                  onResolveInterlude?.(interludeResolutionMode);
                  return;
                }
                onConfirmInterludeResolution();
              }}
            />
          ) : interludeResultSummary !== undefined ? (
            <InterludeResultPanel
              summary={interludeResultSummary}
              onReturn={onClearInterludeResult}
            />
          ) : (
            <p data-life-interlude-result-panel="empty">No interlude result is available.</p>
          )}
        </section>
      </div>
    </section>
  );
}

function renderChoiceOption(option: MajorChoiceOptionInstance, index: number): ReactElement {
  const candidate = option.interludeCandidate;
  return (
    <span className="life-choice-option-content">
      <span>{option.label || `Choice ${index + 1}`}</span>
      {candidate === undefined ? null : (
        <span
          className="life-interlude-preview"
          data-life-interlude-auto-resolve={candidate.autoResolveAllowed}
          data-life-interlude-candidate={candidate.definitionId}
          data-life-interlude-duration={candidate.durationPreview}
          data-life-interlude-mode={candidate.mode}
          data-life-interlude-risk={candidate.displayRisk}
        >
          <span>possible trial</span>
          <span>{candidate.mode}</span>
          <span>{candidate.durationPreview ?? "turns"}</span>
          <span>{candidate.displayRisk}</span>
          <span>{candidate.autoResolveAllowed ? "auto" : "manual"}</span>
        </span>
      )}
    </span>
  );
}
