import type { ReactElement } from "react";

import { GENERATED_UI_ASSET_IDS, type GeneratedUiAssetRegistry } from "../../assets/generatedUiAssets";
import { GeneratedCloseButton, GeneratedFrame, GeneratedImageButton, GeneratedPanel } from "../components/GeneratedUi";

export interface CharacterCreationScreenProps {
  readonly assets: GeneratedUiAssetRegistry;
  readonly onBack?: () => void;
  readonly onConfirmLife?: () => void;
}

const attributeLabels = ["精", "气", "神", "根骨", "悟性", "灵感", "福缘", "心性", "寿元"] as const;
const destinyCards = [
  { assetId: GENERATED_UI_ASSET_IDS.destinyCardCommon, label: "命格一", lockAssetId: GENERATED_UI_ASSET_IDS.traitLockButtonUnlocked },
  { assetId: GENERATED_UI_ASSET_IDS.destinyCardRare, label: "命格二", lockAssetId: GENERATED_UI_ASSET_IDS.traitLockButtonLocked },
  { assetId: GENERATED_UI_ASSET_IDS.destinyCardEpic, label: "命格三", lockAssetId: GENERATED_UI_ASSET_IDS.traitLockButtonUnlocked },
  { assetId: GENERATED_UI_ASSET_IDS.destinyCardLegendary, label: "天命", lockAssetId: GENERATED_UI_ASSET_IDS.traitLockButtonUnlocked },
  { assetId: GENERATED_UI_ASSET_IDS.destinyCardFlaw, label: "劫命", lockAssetId: GENERATED_UI_ASSET_IDS.traitLockButtonLocked }
] as const;

export function CharacterCreationScreen({ assets, onBack, onConfirmLife }: CharacterCreationScreenProps): ReactElement {
  return (
    <section className="character-creation-screen generated-ui-screen" data-testid="character-creation-screen">
      <GeneratedPanel assets={assets} assetId={GENERATED_UI_ASSET_IDS.characterCreationMainPanel} className="character-creation-panel">
        {onBack !== undefined ? <GeneratedCloseButton assets={assets} onClick={onBack} /> : null}

        <div className="character-create-title">天命造化</div>
        <GeneratedFrame assets={assets} assetId={GENERATED_UI_ASSET_IDS.characterPortraitFrame} className="character-portrait-frame">
          <span>立绘</span>
        </GeneratedFrame>

        <GeneratedFrame assets={assets} assetId={GENERATED_UI_ASSET_IDS.nameInputField} className="name-input-field">
          <span>道号未定</span>
        </GeneratedFrame>

        <GeneratedPanel assets={assets} assetId={GENERATED_UI_ASSET_IDS.characterAttributePanel} className="character-attribute-panel">
          {attributeLabels.map((label, index) => (
            <GeneratedFrame key={label} assets={assets} assetId={GENERATED_UI_ASSET_IDS.attributeRow} className="attribute-row">
              <span>{label}</span>
              <strong>{index + 3}</strong>
            </GeneratedFrame>
          ))}
        </GeneratedPanel>

        <GeneratedFrame assets={assets} assetId={GENERATED_UI_ASSET_IDS.spiritualRootDisc} className="spiritual-root-disc">
          <span>灵根</span>
          <div className="element-badge-ring" aria-hidden="true">
            {["金", "木", "水", "火", "土"].map((label) => (
              <GeneratedFrame key={label} assets={assets} assetId={GENERATED_UI_ASSET_IDS.elementBadgeFrame} className="element-badge-frame">
                <span>{label}</span>
              </GeneratedFrame>
            ))}
          </div>
        </GeneratedFrame>

        <div className="destiny-card-grid">
          {destinyCards.map((card) => (
            <GeneratedFrame key={card.label} assets={assets} assetId={card.assetId} className="destiny-card-frame">
              <GeneratedImageButton assets={assets} className="trait-lock-button" normalAssetId={card.lockAssetId} ariaLabel={`${card.label}锁定状态`} />
              <span>{card.label}</span>
              <small>效果区域</small>
            </GeneratedFrame>
          ))}
        </div>

        <GeneratedPanel assets={assets} assetId={GENERATED_UI_ASSET_IDS.backgroundOriginPanel} className="background-origin-panel">
          <strong>身世</strong>
          <span>命册记录区域</span>
        </GeneratedPanel>

        <GeneratedPanel assets={assets} assetId={GENERATED_UI_ASSET_IDS.hiddenBloodlinePanel} className="hidden-bloodline-panel">
          <strong>血脉</strong>
          <span>封印提示区域</span>
        </GeneratedPanel>

        <GeneratedFrame assets={assets} assetId={GENERATED_UI_ASSET_IDS.divinationTokenBadge} className="divination-token-badge">
          <span>3</span>
        </GeneratedFrame>

        <div className="character-creation-actions">
          <GeneratedImageButton
            assets={assets}
            className="reroll-fate-button"
            hoverAssetId={GENERATED_UI_ASSET_IDS.rerollFateButtonHover}
            normalAssetId={GENERATED_UI_ASSET_IDS.rerollFateButtonNormal}
          >
            重新推演
          </GeneratedImageButton>
          <GeneratedImageButton
            assets={assets}
            className="confirm-life-button"
            hoverAssetId={GENERATED_UI_ASSET_IDS.confirmLifeButtonNormal}
            normalAssetId={GENERATED_UI_ASSET_IDS.confirmLifeButtonNormal}
            onClick={onConfirmLife ?? noop}
          >
            确认此生
          </GeneratedImageButton>
        </div>
      </GeneratedPanel>
    </section>
  );
}

function noop(): void {
  return undefined;
}
