import { useMemo, useState, type CSSProperties, type Dispatch, type KeyboardEvent, type ReactElement, type SetStateAction } from "react";

import { CharacterCreationController } from "../../character/CharacterCreationController";
import type {
  CharacterCreationDraft
} from "../../character/CharacterCreationTypes";
import { getDestinyOverlayClasses, getStatAuraCssVars } from "./CharacterCreationFateAltarState";
import {
  getCharacterCreationSelectionForDetailTarget,
  type CharacterCreationDetailTarget
} from "./CharacterCreationDetailInteractions";
import {
  createCharacterCreationViewModel,
  type CharacterCreationDestinyCardViewModel,
  type CharacterCreationDestinyCardSlot as DestinyCardSlot,
  type CharacterCreationDetailTab as DetailTab,
  type CharacterCreationViewModel
} from "./CharacterCreationViewModel";
import { XianxiaButton, XianxiaDialog, XianxiaInput, XianxiaPanel } from "../ui-system";

export interface CharacterCreationScreenProps {
  readonly assets: unknown;
  readonly initialDraft?: CharacterCreationDraft;
  readonly initialActiveTab?: DetailTab;
  readonly initialSelectedSlot?: DestinyCardSlot;
  readonly slotId?: string;
  readonly nowMs?: () => number;
  readonly onBack?: () => void;
  readonly onConfirmLife?: (draft: CharacterCreationDraft) => void;
  readonly initialActionError?: string;
  readonly initialConfirmDialog?: "none" | "confirm-life" | "leave";
  readonly initialFxKind?: CharacterCreationFxKind;
  readonly initialNameInput?: string;
}

type CharacterCreationFxKind = "idle" | "reroll" | "lock" | "confirm";

const DETAIL_TABS: readonly { readonly id: DetailTab; readonly label: string }[] = [
  { id: "stats", label: "属性详情" },
  { id: "root", label: "灵根详情" },
  { id: "destiny", label: "天命详情" },
  { id: "origin", label: "身世血脉" },
  { id: "items", label: "随身物" }
];

const MEDITATION_SILHOUETTE_SRC = "/assets/generated/ui/character_creation/black_meditation_silhouette.png";

export function CharacterCreationScreen({
  initialDraft,
  initialActiveTab = "stats",
  initialSelectedSlot = "main",
  slotId = "slot_preview",
  nowMs = () => Date.now(),
  onBack,
  onConfirmLife,
  initialActionError,
  initialConfirmDialog = "none",
  initialFxKind = "idle",
  initialNameInput
}: CharacterCreationScreenProps): ReactElement {
  const controller = useMemo(() => new CharacterCreationController({ seed: `ccui2:${slotId}` }), [slotId]);
  const [draft, setDraft] = useState<CharacterCreationDraft>(
    () => initialDraft ?? controller.generate({ slotId, nowMs: nowMs() })
  );
  const [nameInput, setNameInput] = useState(() => initialNameInput ?? draft.name);
  const [activeTab, setActiveTab] = useState<DetailTab>(initialActiveTab);
  const [selectedSlot, setSelectedSlot] = useState<DestinyCardSlot>(initialSelectedSlot);
  const [actionError, setActionError] = useState<string | undefined>(initialActionError);
  const [confirmDialog, setConfirmDialog] = useState<"none" | "confirm-life" | "leave">(initialConfirmDialog);
  const [fxState, setFxState] = useState<{ readonly kind: CharacterCreationFxKind; readonly seq: number }>({
    kind: initialFxKind,
    seq: 0
  });

  const viewModel = useMemo(() => createCharacterCreationViewModel(draft, { selectedSlot, activeTab }), [activeTab, draft, selectedSlot]);
  const selectedCard = getDestinyCardForSlot(viewModel, selectedSlot);
  const mainDestinyCard = getDestinyCardForSlot(viewModel, "main");
  const destinyClasses = getDestinyOverlayClasses([draft.destinies.main, ...draft.destinies.secondary, draft.destinies.flaw]);
  const screenStyle = getStatAuraCssVars(draft.coreStats) as CSSProperties;
  const selectedLockKey = viewModel.selectedLockKey;
  const selectedLock = viewModel.selectedLock;
  const lockKeyAttr = selectedLock?.key ?? "none";
  const lockStateAttr = selectedLock?.state ?? "unavailable";
  const lockTargetLabels = viewModel.lockTargets.map((target) => target.label).join("|");
  const actionMessage = actionError ?? viewModel.actions.lock.warning;
  const trimmedName = nameInput.trim();
  const openDetailTarget = (target: CharacterCreationDetailTarget): void => {
    const next = getCharacterCreationSelectionForDetailTarget({ activeTab, selectedSlot }, target);
    setActiveTab(next.activeTab);
    setSelectedSlot(next.selectedSlot);
  };
  const requestLeave = (): void => {
    setActionError(undefined);
    setConfirmDialog("leave");
  };
  const triggerFx = (kind: CharacterCreationFxKind): void => {
    setFxState((current) => ({ kind, seq: current.seq + 1 }));
  };
  const requestConfirmLife = (): void => {
    if (trimmedName.length === 0) {
      setActionError("角色名不能为空");
      setConfirmDialog("none");
      return;
    }
    setActionError(undefined);
    setConfirmDialog("confirm-life");
    triggerFx("confirm");
  };
  const confirmLife = (): void => {
    if (trimmedName.length === 0) {
      setActionError("角色名不能为空");
      setConfirmDialog("none");
      return;
    }
    triggerFx("confirm");
    onConfirmLife?.({ ...draft, name: trimmedName });
  };
  const rerollDraft = (): void => {
    if (updateDraft(setDraft, () => controller.reroll(draft, buildRerollOptions(nowMs(), nameInput)), setActionError)) {
      triggerFx("reroll");
    }
  };
  const divinationRerollDraft = (): void => {
    if (updateDraft(setDraft, () => controller.reroll(draft, buildRerollOptions(nowMs(), nameInput, true)), setActionError)) {
      triggerFx("reroll");
    }
  };
  const toggleSelectedLock = (): void => {
    if (selectedLockKey !== undefined) {
      if (updateDraft(setDraft, () => controller.toggleLock(draft, { lockKey: selectedLockKey, nowMs: nowMs() }), setActionError)) {
        triggerFx("lock");
      }
    }
  };

  return (
    <main
      className={["character-creation-screen ccui2-character-creation", ...destinyClasses].join(" ")}
      data-layout-lock="no-page-scroll"
      data-ccui2-fx={fxState.kind}
      data-ccui2-fx-seq={fxState.seq}
      data-confirm-dialog={confirmDialog}
      data-confirm-life-name={confirmDialog === "confirm-life" ? trimmedName : undefined}
      data-confirm-life-root={confirmDialog === "confirm-life" ? viewModel.spiritualRoot.displayName : undefined}
      data-confirm-life-main-destiny={confirmDialog === "confirm-life" ? mainDestinyCard.name : undefined}
      data-confirm-life-origin={confirmDialog === "confirm-life" ? viewModel.originFate.backgroundName : undefined}
      data-leave-character-creation-warning={confirmDialog === "leave" ? "true" : undefined}
      data-testid="character-creation-screen"
      style={screenStyle}
    >
      <XianxiaPanel className="ccui2-character-shell" tone="ceremonial">
        <header className="ccui2-header">
          <div className="ccui2-header-copy">
            <p>存档名 / 推演</p>
            <strong>{slotId}</strong>
            <span>第 {viewModel.rerollCount} 次</span>
          </div>
          <XianxiaInput
            className="ccui2-name-input"
            data-character-name-input="true"
            label="角色名"
            maxLength={16}
            name="characterName"
            placeholder="请输入此生姓名"
            type="text"
            value={nameInput}
            onValueChange={setNameInput}
          />
          <div className="ccui2-title-block">
            <span>命盘推演台 · 天机值 {viewModel.fateMeter.value}/{viewModel.fateMeter.guaranteeThreshold}</span>
            <h1>推演天命</h1>
          </div>
          <div className="ccui2-header-actions">
            <XianxiaButton className="ccui2-header-button" disabled variant="ghost">
              剩余锁 {viewModel.lockBudget.locksRemaining}/{viewModel.lockBudget.maxLocks}
            </XianxiaButton>
            <XianxiaButton className="ccui2-header-button" variant="ghost" onClick={requestLeave}>
              返回
            </XianxiaButton>
            <XianxiaButton aria-label="关闭" className="ccui2-header-button" variant="ghost" onClick={requestLeave}>
              关闭
            </XianxiaButton>
          </div>
        </header>

        <section className="ccui2-main-stage" aria-label="命盘推演主体">
          <StatQuickPanel viewModel={viewModel} onOpen={() => openDetailTarget({ type: "stats" })} />
          <FateAltar viewModel={viewModel} onOpen={() => openDetailTarget({ type: "root" })} />
          <OriginFateSummary
            viewModel={viewModel}
            onOpenOrigin={() => openDetailTarget({ type: "origin" })}
            onOpenItems={() => openDetailTarget({ type: "items" })}
          />
        </section>

        <section className="ccui2-destiny-card-row" aria-label="天命卡槽">
          {viewModel.destinyCards.map((card) => (
            <button
              key={card.slot}
              className={`ccui2-destiny-card rarity-${card.rarity} ${selectedSlot === card.slot ? "is-selected" : ""} ${card.locked ? "is-locked" : ""}`}
              data-destiny-card-slot={card.slot}
              type="button"
              onClick={() => openDetailTarget({ type: "destiny", slot: card.slot })}
            >
              <span className="ccui2-card-slot">{card.slotLabel} · {card.locked ? "已锁" : "未锁"}</span>
              <strong>{card.name}</strong>
              <em>{card.fateAlignmentLabel}</em>
              <small>{card.qualityLabel} · {card.tags.join(" / ")}</small>
            </button>
          ))}
        </section>

        <XianxiaPanel className="ccui2-detail-drawer" tone="calm">
          <nav className="ccui2-detail-tabs" aria-label="命盘详情分页">
            {DETAIL_TABS.map((tab) => (
              <button
                key={tab.id}
                className={activeTab === tab.id ? "is-active" : ""}
                type="button"
                onClick={() => openDetailTarget(tab.id === "destiny" ? { type: "destiny", slot: selectedSlot } : { type: tab.id })}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="ccui2-detail-scroll" data-scrollable="true">
            {renderDetailBody(activeTab, selectedCard, viewModel)}
          </div>
        </XianxiaPanel>

        <footer
          className="ccui2-action-bar"
          aria-label="角色创建操作"
          data-lock-targets={lockTargetLabels}
          data-reroll-enabled={String(!viewModel.actions.reroll.disabled)}
          data-divination-enabled={String(!viewModel.actions.divination.disabled)}
        >
          {actionMessage === undefined ? null : <span className="ccui2-detail-warning">{actionMessage}</span>}
          <XianxiaButton
            className="ccui2-action-button"
            disabled={viewModel.actions.reroll.disabled}
            variant="secondary"
            onClick={rerollDraft}
          >
            {viewModel.actions.reroll.label}
          </XianxiaButton>
          <XianxiaButton
            aria-pressed={selectedLock?.locked ?? undefined}
            className="ccui2-action-button"
            data-lock-key={lockKeyAttr}
            data-lock-state={lockStateAttr}
            disabled={viewModel.actions.lock.disabled}
            variant="secondary"
            onClick={toggleSelectedLock}
          >
            {viewModel.actions.lock.label}
          </XianxiaButton>
          <XianxiaButton
            className="ccui2-action-button"
            disabled={viewModel.actions.divination.disabled}
            variant="secondary"
            onClick={divinationRerollDraft}
          >
            {viewModel.actions.divination.label}
          </XianxiaButton>
          <XianxiaButton
            className="ccui2-action-button confirm-life-button"
            disabled={viewModel.actions.confirm.disabled}
            onClick={requestConfirmLife}
          >
            {viewModel.actions.confirm.label}
          </XianxiaButton>
          <XianxiaButton className="ccui2-action-button" variant="ghost" onClick={requestLeave}>
            返回
          </XianxiaButton>
        </footer>
        <ConfirmLifeDialog
          name={trimmedName}
          open={confirmDialog === "confirm-life"}
          viewModel={viewModel}
          onCancel={() => setConfirmDialog("none")}
          onConfirm={confirmLife}
        />
        <LeaveCharacterCreationDialog
          open={confirmDialog === "leave"}
          onCancel={() => setConfirmDialog("none")}
          onConfirm={() => onBack?.()}
        />
      </XianxiaPanel>
    </main>
  );
}

function ConfirmLifeDialog({
  name,
  open,
  viewModel,
  onCancel,
  onConfirm
}: {
  readonly name: string;
  readonly open: boolean;
  readonly viewModel: CharacterCreationViewModel;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}): ReactElement {
  const mainDestiny = viewModel.destinyCards.find((card) => card.slot === "main") ?? viewModel.destinyCards[0]!;

  return (
    <XianxiaDialog
      actions={
        <>
          <XianxiaButton variant="secondary" onClick={onCancel}>
            返回修改
          </XianxiaButton>
          <XianxiaButton onClick={onConfirm}>
            确认此生
          </XianxiaButton>
        </>
      }
      className="ccui2-confirm-life-dialog"
      description="确认后会写入角色档案，并进入人生模拟。"
      open={open}
      title="确认此生"
      tone="calm"
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onCancel();
        }
      }}
    >
      <dl data-confirm-life-summary="true">
        <dt>姓名</dt>
        <dd>{name}</dd>
        <dt>灵根</dt>
        <dd>{viewModel.spiritualRoot.displayName}</dd>
        <dt>主天命</dt>
        <dd>{mainDestiny.name}</dd>
        <dt>身世</dt>
        <dd>{viewModel.originFate.backgroundName}</dd>
      </dl>
    </XianxiaDialog>
  );
}

function LeaveCharacterCreationDialog({
  open,
  onCancel,
  onConfirm
}: {
  readonly open: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}): ReactElement {
  return (
    <XianxiaDialog
      actions={
        <>
          <XianxiaButton variant="secondary" onClick={onCancel}>
            继续推演
          </XianxiaButton>
          <XianxiaButton variant="danger" onClick={onConfirm}>
            放弃返回
          </XianxiaButton>
        </>
      }
      className="ccui2-leave-confirm-dialog"
      description="当前命盘尚未确认，返回会放弃本次角色创建。"
      open={open}
      title="放弃此生？"
      tone="danger"
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onCancel();
        }
      }}
    >
      <p data-leave-character-creation-warning="true">未确认的姓名、命盘、身世和随身物不会写入正式档案。</p>
    </XianxiaDialog>
  );
}

function StatQuickPanel({
  viewModel,
  onOpen
}: {
  readonly viewModel: CharacterCreationViewModel;
  readonly onOpen: () => void;
}): ReactElement {
  const rows = [...viewModel.coreTreasureRows, ...viewModel.aptitudeRows];
  return (
    <XianxiaPanel className="ccui2-side-panel ccui2-stat-panel" tone="calm">
      <p className="ccui2-panel-kicker">左仪盘</p>
      <h2>九宫速览</h2>
      <div className="ccui2-stat-grid">
        {rows.map((row) => (
          <button
            key={row.id}
            data-detail-target="stats"
            title={row.description}
            type="button"
            onClick={onOpen}
          >
            {row.label}
            <strong>{row.value}</strong>
          </button>
        ))}
      </div>
    </XianxiaPanel>
  );
}

function FateAltar({
  viewModel,
  onOpen
}: {
  readonly viewModel: CharacterCreationViewModel;
  readonly onOpen: () => void;
}): ReactElement {
  const root = viewModel.spiritualRoot;
  const rootLocked = viewModel.lockTargets.find((target) => target.key === "spiritualRoot")?.locked ?? false;
  return (
    <section className="ccui2-fate-altar" aria-label="中央命盘法阵">
      <div className="ccui2-orbit ccui2-orbit-outer" aria-hidden="true" />
      <div className="ccui2-orbit ccui2-orbit-middle" aria-hidden="true" />
      <div className="ccui2-orbit ccui2-orbit-inner" aria-hidden="true" />
      <div className="ccui2-root-effect-layer" data-root={root.elements.map((element) => element.id).join(" ")} aria-hidden="true" />
      <div className="ccui2-destiny-effect-layer" aria-hidden="true" />
      <img
        alt="黑色打坐小人"
        className="ccui2-meditation-silhouette"
        draggable={false}
        src={MEDITATION_SILHOUETTE_SRC}
      />
      <button
        className={`ccui2-root-metric-strip ${rootLocked ? "is-locked" : ""}`}
        aria-label="灵根四维"
        data-detail-target="root"
        data-lock-state={rootLocked ? "locked" : "unlocked"}
        type="button"
        onClick={onOpen}
      >
        {root.metricRows.map((metric) => (
          <span key={metric.id} data-root-metric={metric.id}>
            {metric.label}
            <strong>{metric.value}</strong>
          </span>
        ))}
      </button>
      <div className="ccui2-altar-caption">
        <strong>{root.displayName}</strong>
      </div>
    </section>
  );
}

function OriginFateSummary({
  viewModel,
  onOpenOrigin,
  onOpenItems
}: {
  readonly viewModel: CharacterCreationViewModel;
  readonly onOpenOrigin: () => void;
  readonly onOpenItems: () => void;
}): ReactElement {
  const origin = viewModel.originFate;
  return (
    <XianxiaPanel className="ccui2-side-panel ccui2-origin-panel" tone="calm">
      <p className="ccui2-panel-kicker">右命简</p>
      <div
        data-detail-target="origin"
        role="button"
        tabIndex={0}
        onClick={onOpenOrigin}
        onKeyDown={(event) => activateWithKeyboard(event, onOpenOrigin)}
      >
        <h2>{origin.backgroundName}</h2>
        <p>{origin.backgroundDescription}</p>
      </div>
      <dl>
        <div
          data-detail-target="origin"
          role="button"
          tabIndex={0}
          onClick={onOpenOrigin}
          onKeyDown={(event) => activateWithKeyboard(event, onOpenOrigin)}
        >
          <dt>血脉征兆</dt>
          <dd>{[origin.omen.levelLabel, ...origin.omen.hints, origin.omen.riskHint].join(" / ")}</dd>
        </div>
        <div
          data-detail-target="items"
          role="button"
          tabIndex={0}
          onClick={onOpenItems}
          onKeyDown={(event) => activateWithKeyboard(event, onOpenItems)}
        >
          <dt>随身物</dt>
          <dd>{origin.carriedItems.map((item) => `${item.name} / ${item.conversionLabel}`).join(" / ")}</dd>
        </div>
      </dl>
    </XianxiaPanel>
  );
}

function renderDetailBody(
  tab: DetailTab,
  selectedCard: CharacterCreationDestinyCardViewModel,
  viewModel: CharacterCreationViewModel
): ReactElement {
  switch (tab) {
    case "stats":
      return (
        <section data-detail-section="stats">
          <h2>属性详情</h2>
          <p>
            精、气、神与六维资质来自当前开局生成器。命盘重 Roll 只更新未锁定的数据，不写入正式存档。
          </p>
          <h3>精气神</h3>
          <ul>
            {viewModel.coreTreasureRows.map((row) => (
              <li key={row.id}>
                <strong>{row.label} {row.value}</strong>：{row.description}
              </li>
            ))}
          </ul>
          <h3>六维资质</h3>
          <ul>
            {viewModel.aptitudeRows.map((row) => (
              <li key={row.id}>
                <strong>{row.label} {row.value}</strong>：{row.description}
              </li>
            ))}
          </ul>
          <p>详情抽屉只展示当前 draft 的可见数据；确认此生后沿用现有 profile 写入流程。</p>
        </section>
      );
    case "root":
      const root = viewModel.spiritualRoot;
      return (
        <section data-detail-section="root">
          <h2>{root.displayName}</h2>
          <p>类型：{root.categoryLabel}</p>
          <p>元素：{root.elements.map((element) => `${element.label} ${element.percentage}%`).join(" / ")}</p>
          <p>主灵根：{root.primaryElement ?? "未显"}；副灵根：{root.secondaryElements.join(" / ") || "无"}；潜藏：{root.latentRoot ?? "无"}</p>
          <ul>
            {root.metricRows.map((metric) => (
              <li key={metric.id} data-root-metric={metric.id}>
                <strong>{metric.label} {metric.value}</strong>：{metric.description}
              </li>
            ))}
          </ul>
          <p>关系：{root.relationTags.length === 0 ? "无" : root.relationTags.join(" / ")}</p>
          <p>标签：{root.tags.join(" / ")}</p>
        </section>
      );
    case "destiny":
      return (
        <section data-detail-section="destiny" data-selected-detail-slot={selectedCard.slot}>
          <h2>{selectedCard.name}</h2>
          <p>品质：{selectedCard.qualityLabel}</p>
          <p>{selectedCard.fateAlignmentLabel}</p>
          <p>{selectedCard.description}</p>
          <p>{selectedCard.tags.join(" / ")}</p>
          <p>正向语义：{selectedCard.positiveEffects.join(" / ")}</p>
          <p className="ccui2-detail-warning">代价语义：{selectedCard.negativeEffects.join(" / ")}</p>
          <p>锁定状态：{selectedCard.locked ? "已锁定" : "未锁定"}</p>
          <p>天机值：{viewModel.fateMeter.value}，剩余锁：{viewModel.lockBudget.locksRemaining}/{viewModel.lockBudget.maxLocks}</p>
          {selectedCard.debugMutationSource === undefined ? null : (
            <section data-destiny-mutation-source="true">
              <h3>Debug 变异来源</h3>
              <p>{selectedCard.debugMutationSource.traitId}</p>
              <p>{selectedCard.debugMutationSource.reasonTags.join(" / ")}</p>
            </section>
          )}
          {selectedCard.synergies.map((synergy) => (
            <p key={synergy.id} data-destiny-synergy={synergy.id}>
              共鸣：{synergy.name} / {synergy.effects.join(" / ")}
            </p>
          ))}
          {viewModel.synergyWarnings.map((warning) => (
            <p key={warning} data-destiny-synergy-warning="true">共鸣：{warning}</p>
          ))}
          {viewModel.conflictWarnings.map((warning) => (
            <p key={warning} className="ccui2-detail-warning" data-destiny-conflict-warning="true">警告：{warning}</p>
          ))}
          {selectedCard.lifeImpactHooks.length === 0 ? null : (
            <section data-destiny-life-impact="true">
              <h3>人生影响</h3>
              {selectedCard.lifeImpactHooks.map((hook) => (
                <p key={`${hook.phase}:${hook.hook}`} data-destiny-life-hook={hook.hook}>
                  {hook.phase} / {hook.hook} / {hook.visible}
                </p>
              ))}
            </section>
          )}
          {selectedCard.modeProjectionBuckets.length === 0 ? null : (
            <section data-destiny-mode-projections="true">
              <h3>模式投射</h3>
              {selectedCard.modeProjectionBuckets.map((bucket) => (
                <p key={bucket.bucket} data-destiny-mode-projection={bucket.bucket}>
                  {bucket.label}: {bucket.tags.join(" / ")}
                </p>
              ))}
            </section>
          )}
        </section>
      );
    case "origin":
      const origin = viewModel.originFate;
      return (
        <section data-detail-section="origin">
          <h2>{origin.backgroundName}</h2>
          <p>{origin.backgroundDescription}</p>
          <p>可见标签：{origin.backgroundTags.join(" / ")}</p>
          <p>{origin.omen.levelLabel}</p>
          {origin.omen.hints.map((hint) => (
            <p key={hint}>隐藏征兆：{hint}</p>
          ))}
          <p className="ccui2-detail-warning">{origin.omen.riskHint}</p>
          <p>相关标签：{origin.omen.relatedTags.join(" / ") || "无"}</p>
        </section>
      );
    case "items":
      return (
        <section data-detail-section="items">
          <h2>随身物</h2>
          {viewModel.originFate.carriedItems.map((item) => (
            <article key={item.itemId}>
              <h3>{item.name}</h3>
              <p>{item.visibleDescription}</p>
              <p>十八岁转换：{item.conversionLabel}</p>
              <p>外战效果：{item.outerBattlefieldEffect}</p>
              <p>洞府钩子：{item.dongfuHook}</p>
              <p>标签：{item.tags.join(" / ")}</p>
            </article>
          ))}
          <p>随身物只展示创建阶段可见信息；十八岁转换由后续流程处理。</p>
        </section>
      );
  }
}

function getDestinyCardForSlot(
  viewModel: CharacterCreationViewModel,
  slot: DestinyCardSlot
): CharacterCreationDestinyCardViewModel {
  return viewModel.destinyCards.find((card) => card.slot === slot) ?? viewModel.destinyCards[0]!;
}

function updateDraft(
  setDraft: Dispatch<SetStateAction<CharacterCreationDraft>>,
  update: () => CharacterCreationDraft,
  setActionError: Dispatch<SetStateAction<string | undefined>>
): boolean {
  try {
    const next = update();
    setDraft(next);
    setActionError(undefined);
    return true;
  } catch (error) {
    setActionError(error instanceof Error ? error.message : String(error));
    return false;
  }
}

function getRerollName(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function buildRerollOptions(
  nowMs: number,
  nameInput: string,
  useDivination?: true
): {
  readonly nowMs: number;
  readonly name?: string;
  readonly useDivination?: true;
} {
  const name = getRerollName(nameInput);
  return {
    nowMs,
    ...(name === undefined ? {} : { name }),
    ...(useDivination === undefined ? {} : { useDivination })
  };
}

function activateWithKeyboard(event: KeyboardEvent<HTMLElement>, action: () => void): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    action();
  }
}
