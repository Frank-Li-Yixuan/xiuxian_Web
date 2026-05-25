import { useMemo, useRef, useState, type CSSProperties, type ReactElement } from "react";

import { GENERATED_UI_ASSET_IDS, type GeneratedUiAssetId, type GeneratedUiAssetRegistry } from "../../assets/generatedUiAssets";
import { CharacterDraftGenerator } from "../../character/CharacterDraftGenerator";
import type {
  CharacterCreationDraft,
  CharacterCreationLockKey,
  CharacterCreationRarity,
  DestinyTraitState
} from "../../character/CharacterCreationTypes";
import {
  getDestinyOverlayClasses,
  getRootAuraAssetId,
  getStatAuraCssVars,
  toggleCharacterCreationLock
} from "./CharacterCreationFateAltarState";
import { GeneratedCloseButton, GeneratedFrame, GeneratedImageButton, GeneratedPanel } from "../components/GeneratedUi";

export interface CharacterCreationScreenProps {
  readonly assets: GeneratedUiAssetRegistry;
  readonly slotId?: string;
  readonly nowMs?: () => number;
  readonly onBack?: () => void;
  readonly onConfirmLife?: (draft: CharacterCreationDraft) => void;
}

type DetailTab = "stats" | "root" | "destiny" | "origin" | "items";
type DestinyCardSlot = "main" | "secondary0" | "secondary1" | "flaw";
type DestinyLockKey = Extract<CharacterCreationLockKey, "mainDestiny" | "secondaryDestiny0" | "secondaryDestiny1" | "flawDestiny">;

interface DestinyCardModel {
  readonly slot: DestinyCardSlot;
  readonly lockKey: DestinyLockKey;
  readonly slotLabel: string;
  readonly trait: DestinyTraitState;
}

const DETAIL_TABS: readonly { readonly id: DetailTab; readonly label: string }[] = [
  { id: "stats", label: "属性详情" },
  { id: "root", label: "灵根详情" },
  { id: "destiny", label: "命格详情" },
  { id: "origin", label: "身世血脉" },
  { id: "items", label: "随身物" }
];

const ELEMENT_LABELS: Readonly<Record<string, string>> = {
  metal: "金",
  wood: "木",
  water: "水",
  fire: "火",
  earth: "土",
  thunder: "雷",
  yin: "阴",
  yang: "阳",
  mixed: "杂"
};

export function CharacterCreationScreen({
  assets,
  slotId = "slot_preview",
  nowMs = () => Date.now(),
  onBack,
  onConfirmLife
}: CharacterCreationScreenProps): ReactElement {
  const generatorRef = useRef<CharacterDraftGenerator | null>(null);
  if (generatorRef.current === null) {
    generatorRef.current = new CharacterDraftGenerator({ seed: `character_creation_${slotId}` });
  }

  const [draft, setDraft] = useState<CharacterCreationDraft>(() =>
    generatorRef.current?.generate({ slotId, nowMs: nowMs() }) ?? new CharacterDraftGenerator({ seed: "character_creation_fallback" }).generate({ slotId, nowMs: nowMs() })
  );
  const [activeTab, setActiveTab] = useState<DetailTab>("stats");
  const [selectedLockKey, setSelectedLockKey] = useState<DestinyLockKey>("mainDestiny");

  const destinyCards = useMemo(() => getDestinyCards(draft), [draft]);
  const selectedTrait = destinyCards.find((card) => card.lockKey === selectedLockKey)?.trait ?? destinyCards[0]?.trait;
  const rootAuraAssetId = getRootAuraAssetId(draft.spiritualRoot);
  const destinyClasses = getDestinyOverlayClasses([draft.destinies.main, ...draft.destinies.secondary, draft.destinies.flaw]);
  const screenStyle = getStatAuraCssVars(draft.coreStats) as CSSProperties;
  const confirmDisabled = draft.name.trim().length === 0;

  const rerollDraft = (): void => {
    setDraft((current) =>
      generatorRef.current?.reroll(current, { locks: current.locks, name: current.name, nowMs: nowMs() }) ?? current
    );
  };
  const toggleSelectedLock = (): void => {
    setDraft((current) => ({
      ...current,
      locks: toggleCharacterCreationLock(current.locks, selectedLockKey),
      updatedAtMs: nowMs()
    }));
  };
  const updateName = (name: string): void => {
    setDraft((current) => ({
      ...current,
      name,
      updatedAtMs: nowMs()
    }));
  };

  return (
    <section
      className={["character-creation-screen generated-ui-screen", ...destinyClasses].join(" ")}
      data-testid="character-creation-screen"
      style={screenStyle}
    >
      <GeneratedPanel assets={assets} assetId={GENERATED_UI_ASSET_IDS.characterCreationMainPanel} className="character-creation-panel">
        <header className="character-creation-header">
          <button className="character-back-text-button" type="button" onClick={onBack ?? noop}>
            返回
          </button>
          <h1>创建角色 / 推演天命</h1>
          <GeneratedCloseButton assets={assets} onClick={onBack ?? noop} />
        </header>

        <div className="character-summary-strip">
          <StatQuickPanel draft={draft} />
          <SpiritualRootSummary draft={draft} />
          <BackgroundOriginSummary draft={draft} />
        </div>

        <div className="character-fate-altar" data-root-aura={assets.path(rootAuraAssetId)}>
          <img alt="" aria-hidden="true" className="fate-altar-disc" src={assets.path(GENERATED_UI_ASSET_IDS.fateAltarDisc)} />
          <img alt="" aria-hidden="true" className="fate-altar-disc-active" src={assets.path(GENERATED_UI_ASSET_IDS.fateAltarDiscActive)} />
          <img alt="" aria-hidden="true" className="root-aura-overlay" src={assets.path(rootAuraAssetId)} />
          <div aria-hidden="true" className="stat-aura-layer stat-aura-jing" />
          <div aria-hidden="true" className="stat-aura-layer stat-aura-qi" />
          <div aria-hidden="true" className="stat-aura-layer stat-aura-shen" />
          <div aria-hidden="true" className="destiny-effect-layer" />
          <img
            alt=""
            aria-label="黑色盘腿修士剪影"
            className="black-meditation-silhouette"
            src={assets.path(GENERATED_UI_ASSET_IDS.blackMeditationSilhouette)}
          />
        </div>

        <div className="character-destiny-row" aria-label="命格卡列表">
          {destinyCards.map((card) => (
            <DestinyCardView
              key={card.slot}
              assets={assets}
              card={card}
              locked={draft.locks[card.lockKey]}
              selected={selectedLockKey === card.lockKey}
              onSelect={() => {
                setSelectedLockKey(card.lockKey);
                setActiveTab("destiny");
              }}
            />
          ))}
        </div>

        <GeneratedPanel
          assets={assets}
          assetId={GENERATED_UI_ASSET_IDS.backgroundOriginPanel}
          className="character-detail-panel"
          data-scrollable="true"
        >
          <nav className="character-detail-tabs" aria-label="角色详情分页">
            {DETAIL_TABS.map((tab) => (
              <button
                key={tab.id}
                className={activeTab === tab.id ? "is-active" : ""}
                type="button"
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="character-detail-body" data-scrollable="true">
            {renderDetailBody(activeTab, draft, selectedTrait)}
          </div>
        </GeneratedPanel>

        <div className="character-action-bar">
          <GeneratedImageButton
            assets={assets}
            className="reroll-fate-button"
            hoverAssetId={GENERATED_UI_ASSET_IDS.rerollFateButtonHover}
            normalAssetId={GENERATED_UI_ASSET_IDS.rerollFateButtonNormal}
            onClick={rerollDraft}
          >
            重新推演
          </GeneratedImageButton>
          <GeneratedImageButton
            assets={assets}
            className="lock-selected-button"
            hoverAssetId={draft.locks[selectedLockKey] ? GENERATED_UI_ASSET_IDS.traitLockButtonLocked : GENERATED_UI_ASSET_IDS.traitLockButtonUnlocked}
            normalAssetId={draft.locks[selectedLockKey] ? GENERATED_UI_ASSET_IDS.traitLockButtonLocked : GENERATED_UI_ASSET_IDS.traitLockButtonUnlocked}
            onClick={toggleSelectedLock}
          >
            {draft.locks[selectedLockKey] ? "解除锁定" : "锁定命格"}
          </GeneratedImageButton>
          <GeneratedFrame assets={assets} assetId={GENERATED_UI_ASSET_IDS.divinationTokenBadge} className="divination-token-badge">
            <span>{draft.divinationTokens}</span>
          </GeneratedFrame>
          <GeneratedImageButton
            assets={assets}
            className="confirm-life-button"
            disabled={confirmDisabled}
            hoverAssetId={GENERATED_UI_ASSET_IDS.confirmLifeButtonNormal}
            normalAssetId={GENERATED_UI_ASSET_IDS.confirmLifeButtonNormal}
            onClick={() => {
              if (!confirmDisabled) {
                onConfirmLife?.(draft);
              }
            }}
          >
            确认此生
          </GeneratedImageButton>
          <GeneratedImageButton
            assets={assets}
            className="return-life-button"
            hoverAssetId={GENERATED_UI_ASSET_IDS.saveLoadButtonNormal}
            normalAssetId={GENERATED_UI_ASSET_IDS.saveLoadButtonNormal}
            onClick={onBack ?? noop}
          >
            返回
          </GeneratedImageButton>
        </div>

        <GeneratedFrame assets={assets} assetId={GENERATED_UI_ASSET_IDS.nameInputField} className="character-name-input-shell">
          <label>
            <span>道号</span>
            <input aria-label="角色名" maxLength={12} type="text" value={draft.name} onChange={(event) => updateName(event.currentTarget.value)} />
          </label>
        </GeneratedFrame>
      </GeneratedPanel>
    </section>
  );
}

function StatQuickPanel({ draft }: { readonly draft: CharacterCreationDraft }): ReactElement {
  const rows = [
    ["精", draft.coreStats.jing],
    ["气", draft.coreStats.qi],
    ["神", draft.coreStats.shen],
    ["根骨", draft.aptitude.rootBone],
    ["悟性", draft.aptitude.comprehension],
    ["灵感", draft.aptitude.inspiration],
    ["气运", draft.aptitude.fortune],
    ["心性", draft.aptitude.heart],
    ["寿元", draft.aptitude.lifespan]
  ] as const;
  return (
    <section className="character-summary-card stat-quick-panel">
      <h2>九宫资质</h2>
      <div>
        {rows.map(([label, value]) => (
          <span key={label}>
            {label}<strong>{value}</strong>
          </span>
        ))}
      </div>
    </section>
  );
}

function SpiritualRootSummary({ draft }: { readonly draft: CharacterCreationDraft }): ReactElement {
  return (
    <section className="character-summary-card spiritual-root-summary">
      <h2>{draft.spiritualRoot.displayName}</h2>
      <p>{draft.spiritualRoot.elements.map((element) => ELEMENT_LABELS[element] ?? element).join(" / ")}</p>
      <small>{draft.spiritualRoot.tags.join(" · ")}</small>
    </section>
  );
}

function BackgroundOriginSummary({ draft }: { readonly draft: CharacterCreationDraft }): ReactElement {
  return (
    <section className="character-summary-card background-origin-summary">
      <h2>{draft.background.name}</h2>
      <p>{draft.hiddenFate.hint}</p>
    </section>
  );
}

function DestinyCardView({
  assets,
  card,
  locked,
  selected,
  onSelect
}: {
  readonly assets: GeneratedUiAssetRegistry;
  readonly card: DestinyCardModel;
  readonly locked: boolean;
  readonly selected: boolean;
  readonly onSelect: () => void;
}): ReactElement {
  const assetId = getDestinyCardAssetId(card.trait.rarity);
  return (
    <GeneratedFrame
      assets={assets}
      assetId={assetId}
      className={`character-destiny-card ${selected ? "is-selected" : ""}`}
      data-destiny-card-slot={card.slot}
    >
      <button className="character-destiny-card-hitbox" type="button" onClick={onSelect}>
        <img
          alt=""
          aria-hidden="true"
          className="destiny-lock-indicator"
          src={assets.path(locked ? GENERATED_UI_ASSET_IDS.traitLockButtonLocked : GENERATED_UI_ASSET_IDS.traitLockButtonUnlocked)}
        />
        <span className="destiny-slot-label">{card.slotLabel}</span>
        <strong>{card.trait.name}</strong>
        <small>{card.trait.tags.slice(0, 3).join(" · ")}</small>
      </button>
    </GeneratedFrame>
  );
}

function renderDetailBody(tab: DetailTab, draft: CharacterCreationDraft, selectedTrait: DestinyTraitState | undefined): ReactElement {
  switch (tab) {
    case "stats":
      return (
        <section>
          <h2>属性详情</h2>
          <p>精气神决定法坛光华强弱，根骨、悟性、灵感、气运、心性与寿元会影响后续人生事件权重。</p>
          <ul>
            <li>精 {draft.coreStats.jing} / 气 {draft.coreStats.qi} / 神 {draft.coreStats.shen}</li>
            <li>根骨 {draft.aptitude.rootBone}，悟性 {draft.aptitude.comprehension}，灵感 {draft.aptitude.inspiration}</li>
            <li>气运 {draft.aptitude.fortune}，心性 {draft.aptitude.heart}，寿元 {draft.aptitude.lifespan}</li>
          </ul>
        </section>
      );
    case "root":
      return (
        <section>
          <h2>{draft.spiritualRoot.displayName}</h2>
          <p>灵根元素：{draft.spiritualRoot.elements.map((element) => ELEMENT_LABELS[element] ?? element).join("、")}</p>
          <p>倾向：{draft.spiritualRoot.tags.join("、")}</p>
        </section>
      );
    case "destiny":
      return (
        <section>
          <h2>{selectedTrait?.name ?? "命格"}</h2>
          <p>{selectedTrait?.positiveEffects.join("；")}</p>
          <p className="character-detail-warning">{selectedTrait?.negativeEffects.join("；")}</p>
        </section>
      );
    case "origin":
      return (
        <section>
          <h2>{draft.background.name}</h2>
          <p>{draft.background.description}</p>
          <p>隐藏预兆：{draft.hiddenFate.hint}</p>
        </section>
      );
    case "items":
      return (
        <section>
          <h2>随身物</h2>
          {draft.carriedItems.map((item) => (
            <p key={item.itemId}>
              <strong>{item.name}</strong>：{item.description}
            </p>
          ))}
        </section>
      );
  }
}

function getDestinyCards(draft: CharacterCreationDraft): readonly DestinyCardModel[] {
  return [
    { slot: "main", lockKey: "mainDestiny", slotLabel: "主命格", trait: draft.destinies.main },
    { slot: "secondary0", lockKey: "secondaryDestiny0", slotLabel: "副命格一", trait: draft.destinies.secondary[0] },
    { slot: "secondary1", lockKey: "secondaryDestiny1", slotLabel: "副命格二", trait: draft.destinies.secondary[1] },
    { slot: "flaw", lockKey: "flawDestiny", slotLabel: "缺陷劫命", trait: draft.destinies.flaw }
  ];
}

function getDestinyCardAssetId(rarity: CharacterCreationRarity): GeneratedUiAssetId {
  switch (rarity) {
    case "rare":
      return GENERATED_UI_ASSET_IDS.destinyCardRare;
    case "epic":
      return GENERATED_UI_ASSET_IDS.destinyCardEpic;
    case "legendary":
      return GENERATED_UI_ASSET_IDS.destinyCardLegendary;
    case "flaw":
      return GENERATED_UI_ASSET_IDS.destinyCardFlaw;
    case "common":
    case "uncommon":
      return GENERATED_UI_ASSET_IDS.destinyCardCommon;
  }
}

function noop(): void {
  return undefined;
}
