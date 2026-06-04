import type { ReactElement } from "react";

import { GENERATED_UI_ASSET_IDS, type GeneratedUiAssetRegistry } from "../../assets/generatedUiAssets";
import type { OutgameProfileState } from "../../outgame/ProfileState";
import type { LifeSimulationState } from "../../types/life-monthly-events-types.v0.1";
import { GeneratedFrame, GeneratedImageButton, GeneratedPanel } from "../components/GeneratedUi";

export interface LifeSimulationScreenProps {
  readonly assets: GeneratedUiAssetRegistry;
  readonly lifeSimulationState?: LifeSimulationState;
  readonly onChoice?: (choiceId: string) => void;
  readonly profile?: OutgameProfileState;
}

const timelineAges = ["0", "3", "6", "9", "12", "15", "18"] as const;
const choiceIds = ["study", "train", "wander"] as const;

export function LifeSimulationScreen({ assets, lifeSimulationState, onChoice, profile }: LifeSimulationScreenProps): ReactElement {
  const characterName = profile?.characterName ?? profile?.characterOrigin?.name ?? "未定道友";
  const stage = profile?.stage ?? "unknown";
  const ageMonths = lifeSimulationState?.ageMonths ?? 0;
  const phaseId = lifeSimulationState?.phaseId ?? "infancy";

  return (
    <section
      className="life-simulation-screen generated-ui-screen"
      data-life-simulation-stage={stage}
      data-testid="life-simulation-screen"
    >
      <div className="life-simulation-layout">
        <GeneratedFrame assets={assets} assetId={GENERATED_UI_ASSET_IDS.lifeTimelineVertical} className="life-timeline-vertical">
          {timelineAges.map((age) => (
            <span key={age}>{age}</span>
          ))}
        </GeneratedFrame>

        <GeneratedPanel assets={assets} assetId={GENERATED_UI_ASSET_IDS.lifeEventLogPanel} className="life-event-log-panel">
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
        </GeneratedPanel>

        <GeneratedPanel assets={assets} assetId={GENERATED_UI_ASSET_IDS.lifeChoiceEventCard} className="life-choice-event-card">
          <h2>命运分岔</h2>
          <p>半岁大事描述区域。玩家将在多个选择之间决定童年与少年命途。</p>
          <div className="life-choice-actions">
            {choiceIds.map((choiceId, index) => (
              <GeneratedImageButton
                key={choiceId}
                assets={assets}
                className="life-choice-button"
                hoverAssetId={GENERATED_UI_ASSET_IDS.lifeChoiceButtonHover}
                normalAssetId={GENERATED_UI_ASSET_IDS.lifeChoiceButtonNormal}
                onClick={() => onChoice?.(choiceId)}
              >
                抉择 {index + 1}
              </GeneratedImageButton>
            ))}
          </div>
        </GeneratedPanel>
      </div>
    </section>
  );
}
