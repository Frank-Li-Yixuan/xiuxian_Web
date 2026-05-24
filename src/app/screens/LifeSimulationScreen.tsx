import type { ReactElement } from "react";

import { GENERATED_UI_ASSET_IDS, type GeneratedUiAssetRegistry } from "../../assets/generatedUiAssets";
import { GeneratedFrame, GeneratedImageButton, GeneratedPanel } from "../components/GeneratedUi";

export interface LifeSimulationScreenProps {
  readonly assets: GeneratedUiAssetRegistry;
  readonly onChoice?: (choiceId: string) => void;
}

const timelineAges = ["0", "3", "6", "9", "12", "15", "18"] as const;
const choiceIds = ["study", "train", "wander"] as const;

export function LifeSimulationScreen({ assets, onChoice }: LifeSimulationScreenProps): ReactElement {
  return (
    <section className="life-simulation-screen generated-ui-screen" data-testid="life-simulation-screen">
      <div className="life-simulation-layout">
        <GeneratedFrame assets={assets} assetId={GENERATED_UI_ASSET_IDS.lifeTimelineVertical} className="life-timeline-vertical">
          {timelineAges.map((age) => (
            <span key={age}>{age}</span>
          ))}
        </GeneratedFrame>

        <GeneratedPanel assets={assets} assetId={GENERATED_UI_ASSET_IDS.lifeEventLogPanel} className="life-event-log-panel">
          <h1>命途纪事</h1>
          <p>月度事件、家族因果、血脉异兆与天命变化将在这里记录。</p>
        </GeneratedPanel>

        <GeneratedPanel assets={assets} assetId={GENERATED_UI_ASSET_IDS.lifeChoiceEventCard} className="life-choice-event-card">
          <h2>命运分岔</h2>
          <p>半年大事描述区域。玩家将在多个选择之间决定童年与少年命途。</p>
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
