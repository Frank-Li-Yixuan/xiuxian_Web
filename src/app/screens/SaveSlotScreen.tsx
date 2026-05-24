import { useMemo, useState, type CSSProperties, type ReactElement } from "react";

import { GENERATED_UI_ASSET_IDS, type GeneratedUiAssetId, type GeneratedUiAssetRegistry } from "../../assets/generatedUiAssets";
import { MAIN_MENU_ASSET_IDS, type MainMenuAssetRegistry } from "../../assets/mainMenuAssets";
import type { OutgameProfileState } from "../../outgame/ProfileState";
import { createDefaultProfileForSlot } from "../../save/ProfileFactory";
import type { SaveSlotId, SaveSlotMode, SaveSlotService, SaveSlotSummary } from "../../save/SaveSlotService";
import { GeneratedCloseButton, GeneratedImageButton, GeneratedPanel } from "../components/GeneratedUi";

export interface SaveSlotScreenProps {
  readonly assets: MainMenuAssetRegistry;
  readonly generatedUiAssets: GeneratedUiAssetRegistry;
  readonly mode: SaveSlotMode;
  readonly service: SaveSlotService;
  readonly onBack: () => void;
  readonly onProfileReady: (profile: OutgameProfileState) => void;
}

export function SaveSlotScreen({ assets, generatedUiAssets, mode, service, onBack, onProfileReady }: SaveSlotScreenProps): ReactElement {
  const [revision, setRevision] = useState(0);
  const [selectedSlotId, setSelectedSlotId] = useState<SaveSlotId | null>(null);
  const slots = useMemo(() => service.listSlots(), [revision, service]);
  const selectedSlot = selectedSlotId === null ? undefined : slots.find((slot) => slot.slotId === selectedSlotId);

  const selectSlot = (slot: SaveSlotSummary): void => {
    setSelectedSlotId(slot.slotId);
  };

  const activateSelectedSlot = (): void => {
    if (selectedSlot === undefined) {
      return;
    }
    if (mode === "continue") {
      if (selectedSlot.profile !== null) {
        onProfileReady(selectedSlot.profile);
      }
      return;
    }
    if (selectedSlot.profile !== null) {
      createAndOpenProfile(selectedSlot.slotId);
      return;
    }
    createAndOpenProfile(selectedSlot.slotId);
  };

  const createAndOpenProfile = (slotId: SaveSlotId): void => {
    const profile = createDefaultProfileForSlot({ slotId, nowMs: service.nowMs() });
    service.writeProfile(slotId, profile);
    setRevision((value) => value + 1);
    onProfileReady(profile);
  };

  return (
    <section
      className="main-menu-screen save-slot-screen"
      data-testid="save-slot-screen"
      style={{ backgroundImage: `url("${assets.path(MAIN_MENU_ASSET_IDS.background)}")` }}
    >
      <GeneratedPanel assets={generatedUiAssets} assetId={GENERATED_UI_ASSET_IDS.savePanelFrame} className="save-slot-panel">
        <div
          aria-hidden="true"
          className="save-panel-inner-bg"
          style={{ backgroundImage: `url("${generatedUiAssets.path(GENERATED_UI_ASSET_IDS.savePanelInnerBackground)}")` }}
        />
        <GeneratedCloseButton assets={generatedUiAssets} onClick={onBack} />
        <header>
          <img alt="" src={assets.path(MAIN_MENU_ASSET_IDS.titlePlaque)} />
          <h1>{mode === "new" ? "选择存档位" : "读取存档"}</h1>
        </header>

        <div className="save-slot-list">
          {slots.map((slot) => (
            <SaveSlotCard
              key={slot.slotId}
              assets={generatedUiAssets}
              selected={slot.slotId === selectedSlotId}
              slot={slot}
              onSelect={() => selectSlot(slot)}
            />
          ))}
        </div>
      </GeneratedPanel>

      {selectedSlot !== undefined ? (
        <SaveSlotActionDialog
          assets={generatedUiAssets}
          mode={mode}
          slot={selectedSlot}
          onCancel={() => setSelectedSlotId(null)}
          onConfirm={activateSelectedSlot}
        />
      ) : null}
    </section>
  );
}

function SaveSlotCard({
  assets,
  selected,
  slot,
  onSelect
}: {
  readonly assets: GeneratedUiAssetRegistry;
  readonly selected: boolean;
  readonly slot: SaveSlotSummary;
  readonly onSelect: () => void;
}): ReactElement {
  const empty = slot.profile === null;
  const realm = slot.profile?.realm;

  return (
    <button
      aria-pressed={selected}
      className={`save-slot-card ${empty ? "is-empty" : "is-occupied"} ${selected ? "is-selected" : ""}`}
      style={
        {
          "--slot-image": `url("${assets.path(GENERATED_UI_ASSET_IDS.saveSlotEmpty)}")`,
          "--slot-hover": `url("${assets.path(GENERATED_UI_ASSET_IDS.saveSlotEmpty)}")`,
          "--slot-selected": `url("${assets.path(GENERATED_UI_ASSET_IDS.saveSlotEmpty)}")`
        } as CSSProperties
      }
      type="button"
      onClick={onSelect}
    >
      <span className="save-slot-copy">
        <strong>{slot.profile === null ? "空存档" : `存档 ${slot.index + 1}`}</strong>
        {realm === undefined ? null : (
          <small>{`练气 ${realm.layer} 层 · 修为 ${Math.round(realm.cultivation)}/${realm.cultivationToNext}`}</small>
        )}
      </span>
    </button>
  );
}

function getSelectedAction(mode: SaveSlotMode, selectedSlot: SaveSlotSummary): null | {
  readonly hoverAssetId: GeneratedUiAssetId;
  readonly label: string;
  readonly normalAssetId: GeneratedUiAssetId;
} {
  if (mode === "continue") {
    if (selectedSlot.profile === null) {
      return null;
    }
    return {
      hoverAssetId: GENERATED_UI_ASSET_IDS.saveLoadButtonNormal,
      label: "载入存档",
      normalAssetId: GENERATED_UI_ASSET_IDS.saveLoadButtonNormal
    };
  }
  if (selectedSlot.profile !== null) {
    return {
      hoverAssetId: GENERATED_UI_ASSET_IDS.saveDangerButtonNormal,
      label: "覆盖存档",
      normalAssetId: GENERATED_UI_ASSET_IDS.saveDangerButtonNormal
    };
  }
  return {
    hoverAssetId: GENERATED_UI_ASSET_IDS.saveCreateButtonHover,
    label: "创建新存档",
    normalAssetId: GENERATED_UI_ASSET_IDS.saveCreateButtonNormal
  };
}

function SaveSlotActionDialog({
  assets,
  mode,
  slot,
  onCancel,
  onConfirm
}: {
  readonly assets: GeneratedUiAssetRegistry;
  readonly mode: SaveSlotMode;
  readonly slot: SaveSlotSummary;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}): ReactElement {
  const action = getSelectedAction(mode, slot);
  const title = getDialogTitle(mode, slot);
  const message = getDialogMessage(mode, slot);
  const warning = mode === "new" && slot.profile !== null;

  return (
    <div className="modal-scrim" role="presentation">
      <section
        aria-modal="true"
        className={`overwrite-dialog save-slot-action-dialog ${warning ? "is-warning" : "is-plain"}`}
        role="dialog"
        style={{
          backgroundImage: `url("${assets.path(
            warning ? GENERATED_UI_ASSET_IDS.saveOverwriteConfirmDialog : GENERATED_UI_ASSET_IDS.savePanelInnerBackground
          )}")`
        }}
      >
        <GeneratedCloseButton assets={assets} onClick={onCancel} />
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="dialog-actions">
          <GeneratedImageButton assets={assets} className="dialog-generated-button" normalAssetId={GENERATED_UI_ASSET_IDS.saveLoadButtonNormal} onClick={onCancel}>
            返回
          </GeneratedImageButton>
          {action === null ? null : (
            <GeneratedImageButton
              assets={assets}
              className="dialog-generated-button"
              hoverAssetId={action.hoverAssetId}
              normalAssetId={action.normalAssetId}
              onClick={onConfirm}
            >
              {action.label}
            </GeneratedImageButton>
          )}
        </div>
      </section>
    </div>
  );
}

function getDialogTitle(mode: SaveSlotMode, slot: SaveSlotSummary): string {
  if (mode === "continue") {
    return slot.profile === null ? "空存档" : `读取存档 ${slot.index + 1}`;
  }
  return slot.profile === null ? `创建存档 ${slot.index + 1}` : `覆盖存档 ${slot.index + 1}`;
}

function getDialogMessage(mode: SaveSlotMode, slot: SaveSlotSummary): string {
  const realm = slot.profile?.realm;
  if (mode === "continue") {
    if (realm === undefined) {
      return "这个存档位还没有洞府记录，无法读取。";
    }
    return `此存档为练气 ${realm.layer} 层，当前修为 ${Math.round(realm.cultivation)}/${realm.cultivationToNext}。`;
  }
  if (realm === undefined) {
    return "将在这个空存档位创建新的默认洞府记录。";
  }
  return `这个存档位已有练气 ${realm.layer} 层记录。确认后会以新的默认洞府记录覆盖。`;
}
