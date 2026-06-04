import { useMemo, useState, type ReactElement } from "react";

import type { GeneratedUiAssetRegistry } from "../../assets/generatedUiAssets";
import { MAIN_MENU_ASSET_IDS, type MainMenuAssetRegistry } from "../../assets/mainMenuAssets";
import type { OutgameProfileState } from "../../outgame/ProfileState";
import { createDefaultProfileForSlot, DEFAULT_CHARACTER_NAME } from "../../save/ProfileFactory";
import type { SaveSlotId, SaveSlotMode, SaveSlotService, SaveSlotSummary } from "../../save/SaveSlotService";
import { MistLayer, XianxiaButton, XianxiaDialog, XianxiaInput, XianxiaPanel, XianxiaSaveCard } from "../ui-system";

export interface SaveSlotScreenProps {
  readonly assets: MainMenuAssetRegistry;
  readonly generatedUiAssets: GeneratedUiAssetRegistry;
  readonly mode: SaveSlotMode;
  readonly service: SaveSlotService;
  readonly onBack: () => void;
  readonly onProfileCreated: (slotId: SaveSlotId, profile: OutgameProfileState) => void;
  readonly onProfileReady: (profile: OutgameProfileState) => void;
}

export function SaveSlotScreen({ assets, generatedUiAssets: _generatedUiAssets, mode, service, onBack, onProfileCreated, onProfileReady }: SaveSlotScreenProps): ReactElement {
  const [revision, setRevision] = useState(0);
  const [selectedSlotId, setSelectedSlotId] = useState<SaveSlotId | null>(null);
  const [pendingSaveName, setPendingSaveName] = useState("");
  const slots = useMemo(() => service.listSlots(), [revision, service]);
  const selectedSlot = selectedSlotId === null ? undefined : slots.find((slot) => slot.slotId === selectedSlotId);

  const selectSlot = (slot: SaveSlotSummary): void => {
    if (mode === "continue" && slot.profile === null) {
      return;
    }
    setSelectedSlotId(slot.slotId);
    setPendingSaveName("");
  };

  const activateSelectedSlot = (): void => {
    if (selectedSlot === undefined) {
      return;
    }
    if (mode === "continue") {
      if (selectedSlot.profile !== null) {
        if (getSaveSlotContinuationTarget(selectedSlot.profile) === "character_creation") {
          onProfileCreated(selectedSlot.slotId, selectedSlot.profile);
        } else {
          onProfileReady(selectedSlot.profile);
        }
      }
      return;
    }
    const saveName = pendingSaveName.trim();
    if (saveName.length === 0) {
      return;
    }
    createAndOpenProfile(selectedSlot.slotId, saveName);
  };

  const createAndOpenProfile = (slotId: SaveSlotId, saveName: string): void => {
    const profile = createDefaultProfileForSlot({ slotId, nowMs: service.nowMs(), saveName });
    service.writeProfile(slotId, profile);
    setRevision((value) => value + 1);
    onProfileCreated(slotId, profile);
  };

  return (
    <section
      className="main-menu-screen save-slot-screen"
      data-testid="save-slot-screen"
      style={{ backgroundImage: `url("${assets.path(MAIN_MENU_ASSET_IDS.background)}")` }}
    >
      <MistLayer />
      <XianxiaPanel className="xianxia-save-panel" tone="ceremonial">
        <XianxiaButton aria-label="返回主菜单" className="xianxia-screen-close" variant="ghost" onClick={onBack}>
          返回
        </XianxiaButton>
        <header className="xianxia-save-header">
          <img alt="" src={assets.path(MAIN_MENU_ASSET_IDS.titlePlaque)} />
          <h1>{mode === "new" ? "选择命簿" : "读取命簿"}</h1>
          <p>{mode === "new" ? "择一卷玉简，写下此生开端。" : "寻回既有命簿，续写修行因果。"}</p>
        </header>

        <div className="xianxia-save-list">
          {slots.map((slot) => (
            <SaveSlotCard
              key={slot.slotId}
              disabled={mode === "continue" && slot.profile === null}
              selected={slot.slotId === selectedSlotId}
              slot={slot}
              onSelect={() => selectSlot(slot)}
            />
          ))}
        </div>
      </XianxiaPanel>

      {selectedSlot !== undefined ? (
        <SaveSlotActionDialog
          mode={mode}
          pendingSaveName={pendingSaveName}
          slot={selectedSlot}
          onCancel={() => setSelectedSlotId(null)}
          onConfirm={activateSelectedSlot}
          onSaveNameChange={setPendingSaveName}
        />
      ) : null}
    </section>
  );
}

function SaveSlotCard({
  disabled,
  selected,
  slot,
  onSelect
}: {
  readonly disabled: boolean;
  readonly selected: boolean;
  readonly slot: SaveSlotSummary;
  readonly onSelect: () => void;
}): ReactElement {
  const empty = slot.profile === null;
  const display = slot.profile === null ? null : getSaveSlotDisplay(slot);

  return (
    <XianxiaSaveCard
      aria-pressed={selected}
      characterName={display?.characterName}
      cultivation={display?.cultivation}
      disabled={disabled}
      empty={empty}
      progress={display?.progress}
      saveName={display?.saveName}
      onClick={onSelect}
    />
  );
}

function getSelectedAction(mode: SaveSlotMode, selectedSlot: SaveSlotSummary): null | {
  readonly label: string;
  readonly variant: "primary" | "danger";
} {
  if (mode === "continue") {
    if (selectedSlot.profile === null) {
      return null;
    }
    return {
      label: "载入存档",
      variant: "primary"
    };
  }
  if (selectedSlot.profile !== null) {
    return {
      label: "覆盖并创建",
      variant: "danger"
    };
  }
  return {
    label: "进入创建角色",
    variant: "primary"
  };
}

function SaveSlotActionDialog({
  mode,
  pendingSaveName,
  slot,
  onCancel,
  onConfirm,
  onSaveNameChange
}: {
  readonly mode: SaveSlotMode;
  readonly pendingSaveName: string;
  readonly slot: SaveSlotSummary;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly onSaveNameChange: (value: string) => void;
}): ReactElement {
  const action = getSelectedAction(mode, slot);
  const title = getDialogTitle(mode, slot);
  const message = getDialogMessage(mode, slot);
  const warning = mode === "new" && slot.profile !== null;
  const saveNameRequired = mode === "new";
  const actionDisabled = action === null || (saveNameRequired && pendingSaveName.trim().length === 0);

  return (
    <XianxiaDialog
      actions={
        <>
          <XianxiaButton variant="secondary" onClick={onCancel}>
            返回
          </XianxiaButton>
          {action === null ? null : (
            <XianxiaButton disabled={actionDisabled} variant={action.variant} onClick={onConfirm}>
              {action.label}
            </XianxiaButton>
          )}
        </>
      }
      className="save-slot-action-dialog"
      description={message}
      open
      title={title}
      tone={warning ? "danger" : "calm"}
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
    >
      <form
        className="xianxia-save-dialog-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!actionDisabled) {
            onConfirm();
          }
        }}
      >
        {saveNameRequired ? (
          <XianxiaInput
            autoFocus
            label="存档名"
            maxLength={16}
            placeholder="请输入存档名"
            type="text"
            value={pendingSaveName}
            onValueChange={onSaveNameChange}
          />
        ) : null}
      </form>
    </XianxiaDialog>
  );
}

function getDialogTitle(mode: SaveSlotMode, slot: SaveSlotSummary): string {
  if (mode === "continue") {
    return slot.profile === null ? "空存档" : "读取存档";
  }
  return slot.profile === null ? "填写存档名" : "覆盖存档";
}

function getDialogMessage(mode: SaveSlotMode, slot: SaveSlotSummary): string {
  const profile = slot.profile;
  const realm = profile?.realm;
  if (mode === "continue") {
    if (profile === null || realm === undefined) {
      return "这个存档位还没有洞府记录，无法读取。";
    }
    if (getSaveSlotContinuationTarget(profile) === "character_creation") {
      return "此存档仍在模拟中，载入后回到创建角色流程。";
    }
    return `此存档当前 ${getCultivationLine(profile, false)}。`;
  }
  if (realm === undefined) {
    return "输入存档名后，将进入创建角色页面。";
  }
  return "这个存档位已有记录。输入新存档名后会覆盖，并进入创建角色页面。";
}

export function getSaveSlotDisplay(slot: SaveSlotSummary): {
  readonly saveName: string;
  readonly characterName: string;
  readonly progress: string | null;
  readonly cultivation: string;
} {
  const profile = slot.profile;
  if (profile === null) {
    throw new Error("cannot format an empty save slot");
  }
  const status = profile.lifeSimulation?.status ?? "completed";
  return {
    saveName: profile.saveName ?? `存档 ${slot.index + 1}`,
    characterName: profile.characterName ?? DEFAULT_CHARACTER_NAME,
    progress: status === "simulating" ? "当前进度：模拟中" : null,
    cultivation: getCultivationLine(profile, true)
  };
}

export type SaveSlotContinuationTarget = "character_creation" | "profile_ready";

export function getSaveSlotContinuationTarget(profile: OutgameProfileState): SaveSlotContinuationTarget {
  if (profile.stage === "character_creation") {
    return "character_creation";
  }
  if (profile.stage === "life_simulation") {
    return "profile_ready";
  }
  return profile.lifeSimulation?.status === "simulating" ? "character_creation" : "profile_ready";
}

function getCultivationLine(profile: OutgameProfileState, includeAge: boolean): string {
  const ageYears = profile.lifeSimulation?.ageYears ?? 18;
  const cultivation = `练气 ${profile.realm.layer}层 · 修为 ${Math.round(profile.realm.cultivation)}/${profile.realm.cultivationToNext}`;
  return includeAge ? `${ageYears}岁 · ${cultivation}` : cultivation;
}
