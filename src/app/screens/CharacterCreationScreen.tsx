import { useMemo, useState, type CSSProperties, type ReactElement } from "react";

import type { GeneratedUiAssetRegistry } from "../../assets/generatedUiAssets";
import type {
  CharacterCreationDraft,
  CharacterCreationRarity,
  DestinyTraitState
} from "../../character/CharacterCreationTypes";
import { getDestinyOverlayClasses, getStatAuraCssVars } from "./CharacterCreationFateAltarState";
import { XianxiaButton, XianxiaPanel } from "../ui-system";

export interface CharacterCreationScreenProps {
  readonly assets: GeneratedUiAssetRegistry;
  readonly slotId?: string;
  readonly nowMs?: () => number;
  readonly onBack?: () => void;
  readonly onConfirmLife?: (draft: CharacterCreationDraft) => void;
}

type DetailTab = "stats" | "root" | "destiny" | "origin" | "items";
type DestinyCardSlot = "main" | "secondary0" | "secondary1" | "flaw";

interface DestinyCardModel {
  readonly slot: DestinyCardSlot;
  readonly slotLabel: string;
  readonly trait: DestinyTraitState;
}

const DETAIL_TABS: readonly { readonly id: DetailTab; readonly label: string }[] = [
  { id: "stats", label: "属性详情" },
  { id: "root", label: "灵根详情" },
  { id: "destiny", label: "天命详情" },
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
  yang: "阳"
};

export function CharacterCreationScreen({
  slotId = "slot_preview",
  nowMs = () => Date.now(),
  onBack,
  onConfirmLife
}: CharacterCreationScreenProps): ReactElement {
  const [draft] = useState<CharacterCreationDraft>(() => createPlaceholderDraft(slotId, nowMs()));
  const [activeTab, setActiveTab] = useState<DetailTab>("stats");
  const [selectedSlot, setSelectedSlot] = useState<DestinyCardSlot>("main");

  const destinyCards = useMemo(() => getDestinyCards(draft), [draft]);
  const selectedTrait = destinyCards.find((card) => card.slot === selectedSlot)?.trait ?? draft.destinies.main;
  const destinyClasses = getDestinyOverlayClasses([draft.destinies.main, ...draft.destinies.secondary, draft.destinies.flaw]);
  const screenStyle = getStatAuraCssVars(draft.coreStats) as CSSProperties;

  return (
    <main
      className={["character-creation-screen ccui2-character-creation", ...destinyClasses].join(" ")}
      data-layout-lock="no-page-scroll"
      data-testid="character-creation-screen"
      style={screenStyle}
    >
      <XianxiaPanel className="ccui2-character-shell" tone="ceremonial">
        <header className="ccui2-header">
          <div className="ccui2-header-copy">
            <p>存档名</p>
            <strong>{slotId}</strong>
          </div>
          <div className="ccui2-title-block">
            <span>命盘推演台</span>
            <h1>推演天命</h1>
          </div>
          <div className="ccui2-header-actions">
            <XianxiaButton className="ccui2-header-button" variant="ghost" onClick={onBack ?? noop}>
              返回
            </XianxiaButton>
            <XianxiaButton aria-label="关闭" className="ccui2-header-button" variant="ghost" onClick={onBack ?? noop}>
              关闭
            </XianxiaButton>
          </div>
        </header>

        <section className="ccui2-main-stage" aria-label="命盘推演主体">
          <StatQuickPanel draft={draft} />
          <FateAltar draft={draft} />
          <OriginFateSummary draft={draft} />
        </section>

        <section className="ccui2-destiny-card-row" aria-label="天命卡槽">
          {destinyCards.map((card) => (
            <button
              key={card.slot}
              className={`ccui2-destiny-card rarity-${card.trait.rarity} ${selectedSlot === card.slot ? "is-selected" : ""}`}
              data-destiny-card-slot={card.slot}
              type="button"
              onClick={() => {
                setSelectedSlot(card.slot);
                setActiveTab("destiny");
              }}
            >
              <span className="ccui2-card-slot">{card.slotLabel}</span>
              <strong>{card.trait.name}</strong>
              <small>{card.trait.tags.join(" / ")}</small>
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
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="ccui2-detail-scroll" data-scrollable="true">
            {renderDetailBody(activeTab, draft, selectedTrait)}
          </div>
        </XianxiaPanel>

        <footer className="ccui2-action-bar" aria-label="角色创建操作">
          <XianxiaButton className="ccui2-action-button" disabled variant="secondary">
            重新推演
          </XianxiaButton>
          <XianxiaButton className="ccui2-action-button" disabled variant="secondary">
            锁定项
          </XianxiaButton>
          <XianxiaButton className="ccui2-action-button" disabled variant="secondary">
            天机推演
          </XianxiaButton>
          <XianxiaButton className="ccui2-action-button confirm-life-button" onClick={() => onConfirmLife?.(draft)}>
            确认此生
          </XianxiaButton>
          <XianxiaButton className="ccui2-action-button" variant="ghost" onClick={onBack ?? noop}>
            返回
          </XianxiaButton>
        </footer>
      </XianxiaPanel>
    </main>
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
    <XianxiaPanel className="ccui2-side-panel ccui2-stat-panel" tone="calm">
      <p className="ccui2-panel-kicker">左仪盘</p>
      <h2>九宫速览</h2>
      <div className="ccui2-stat-grid">
        {rows.map(([label, value]) => (
          <span key={label}>
            {label}
            <strong>{value}</strong>
          </span>
        ))}
      </div>
    </XianxiaPanel>
  );
}

function FateAltar({ draft }: { readonly draft: CharacterCreationDraft }): ReactElement {
  return (
    <section className="ccui2-fate-altar" aria-label="中央命盘法阵">
      <div className="ccui2-orbit ccui2-orbit-outer" aria-hidden="true" />
      <div className="ccui2-orbit ccui2-orbit-middle" aria-hidden="true" />
      <div className="ccui2-orbit ccui2-orbit-inner" aria-hidden="true" />
      <div className="ccui2-root-effect-layer" data-root={draft.spiritualRoot.elements.join(" ")} aria-hidden="true" />
      <div className="ccui2-destiny-effect-layer" aria-hidden="true" />
      <div className="ccui2-meditation-silhouette" aria-label="黑色打坐小人">
        <span className="ccui2-silhouette-head" aria-hidden="true" />
        <span className="ccui2-silhouette-body" aria-hidden="true" />
        <span className="ccui2-silhouette-legs" aria-hidden="true" />
      </div>
      <div className="ccui2-altar-caption">
        <strong>{draft.spiritualRoot.displayName}</strong>
        <span>{draft.destinies.main.name}</span>
      </div>
    </section>
  );
}

function OriginFateSummary({ draft }: { readonly draft: CharacterCreationDraft }): ReactElement {
  return (
    <XianxiaPanel className="ccui2-side-panel ccui2-origin-panel" tone="calm">
      <p className="ccui2-panel-kicker">右命简</p>
      <h2>{draft.background.name}</h2>
      <p>{draft.background.description}</p>
      <dl>
        <div>
          <dt>血脉征兆</dt>
          <dd>{draft.hiddenFate.hint}</dd>
        </div>
        <div>
          <dt>随身物</dt>
          <dd>{draft.carriedItems.map((item) => item.name).join(" / ")}</dd>
        </div>
      </dl>
    </XianxiaPanel>
  );
}

function renderDetailBody(tab: DetailTab, draft: CharacterCreationDraft, selectedTrait: DestinyTraitState): ReactElement {
  switch (tab) {
    case "stats":
      return (
        <section>
          <h2>属性详情</h2>
          <p>
            这里暂放角色创建骨架数据。精、气、神只用于当前命盘视觉强弱展示，尚未接入真实 OAG/DT/HFO 生成器。
          </p>
          <ul>
            <li>精 {draft.coreStats.jing} / 气 {draft.coreStats.qi} / 神 {draft.coreStats.shen}</li>
            <li>根骨 {draft.aptitude.rootBone}，悟性 {draft.aptitude.comprehension}，灵感 {draft.aptitude.inspiration}</li>
            <li>气运 {draft.aptitude.fortune}，心性 {draft.aptitude.heart}，寿元 {draft.aptitude.lifespan}</li>
          </ul>
          <p>
            长描述会限制在详情抽屉内部滚动。底部操作条与命格卡行不参与整页滚动，用于验证 1366x768 时关键操作仍然可见。
          </p>
          <p>
            占位说明一：后续接入真实开局属性时，这里展示可解释的来源、稀有度和锁定状态，不在页面主体制造额外滚动。
          </p>
          <p>
            占位说明二：命盘推演台只负责角色创建展示，不触碰战斗模拟、不写入 `src/sim/**`，确认此生后沿用现有 profile 写入流程。
          </p>
          <p>
            占位说明三：较长的命格、灵根、身世文本都应收束在这个详情抽屉中，让命格卡和底部按钮始终停留在视野内。
          </p>
        </section>
      );
    case "root":
      return (
        <section>
          <h2>{draft.spiritualRoot.displayName}</h2>
          <p>灵根元素：{draft.spiritualRoot.elements.map((element) => ELEMENT_LABELS[element] ?? element).join(" / ")}</p>
          <p>占位倾向：{draft.spiritualRoot.tags.join(" / ")}</p>
          <p>
            灵根特效层当前只影响中央命盘的 DOM/CSS 光环，不读取外部图片，也不写入模拟层。后续数据接入时只需要替换这里的占位 draft。
          </p>
        </section>
      );
    case "destiny":
      return (
        <section>
          <h2>{selectedTrait.name}</h2>
          <p>正向语义：{selectedTrait.positiveEffects.join(" / ")}</p>
          <p className="ccui2-detail-warning">代价语义：{selectedTrait.negativeEffects.join(" / ")}</p>
          <p>
            当前命格卡只提供骨架、选中态与详情展示。重新推演、锁定项和天机推演按钮均为占位，不执行真实抽取逻辑。
          </p>
        </section>
      );
    case "origin":
      return (
        <section>
          <h2>{draft.background.name}</h2>
          <p>{draft.background.description}</p>
          <p>可见效果：{draft.background.visibleEffects.join(" / ")}</p>
          <p>隐藏征兆：{draft.hiddenFate.hint}</p>
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
          <p>
            随身物当前只用于占位展示，不转换外域战场资源，也不影响人生模拟或战斗配置。
          </p>
        </section>
      );
  }
}

function getDestinyCards(draft: CharacterCreationDraft): readonly DestinyCardModel[] {
  return [
    { slot: "main", slotLabel: "主天命", trait: draft.destinies.main },
    { slot: "secondary0", slotLabel: "副天命 1", trait: draft.destinies.secondary[0] },
    { slot: "secondary1", slotLabel: "副天命 2", trait: draft.destinies.secondary[1] },
    { slot: "flaw", slotLabel: "劫命", trait: draft.destinies.flaw }
  ];
}

function createPlaceholderDraft(slotId: string, nowMs: number): CharacterCreationDraft {
  return {
    draftId: `${slotId}_ccui2_placeholder`,
    slotId,
    name: "未定道号",
    appearance: {
      templateId: "ccui2_black_meditation_placeholder",
      genderPresentation: "androgynous",
      temperament: "calm",
      robeColor: "ink"
    },
    coreStats: { jing: 62, qi: 71, shen: 68 },
    aptitude: {
      rootBone: 64,
      comprehension: 72,
      inspiration: 66,
      fortune: 58,
      heart: 76,
      lifespan: 61
    },
    spiritualRoot: {
      rootId: "placeholder_thunder_wood",
      displayName: "雷木灵根",
      elements: ["thunder", "wood"],
      rarity: "rare",
      tags: ["雷法", "生机", "试炼占位"]
    },
    openingInnateDraft: createPlaceholderOpeningInnateDraft(slotId),
    destinies: {
      main: destiny("placeholder_main_fate", "雷心照命", "epic", ["雷法", "命盘"], ["开局法术反馈更清晰"], ["高压试炼更容易显形"]),
      secondary: [
        destiny("placeholder_secondary_sword", "剑骨微鸣", "rare", ["剑修", "法宝"], ["飞剑语义增强"], ["尚未接入真实加成"]),
        destiny("placeholder_secondary_alchemy", "丹火留香", "rare", ["丹药", "火候"], ["丹药提示更醒目"], ["尚未接入真实消化"])
      ],
      flaw: destiny("placeholder_flaw", "劫云压顶", "flaw", ["劫命", "天象"], ["雷劫语义明确"], ["危险预兆更频繁"])
    },
    background: {
      backgroundId: "placeholder_mountain_orphan",
      name: "青云山脚孤童",
      rarity: "common",
      description: "你从青云山脚醒来，随身只有半枚旧玉和一段记不清来源的雷纹梦。",
      visibleEffects: ["外域试炼初始说明", "洞府入口占位"]
    },
    hiddenFate: {
      hiddenFateId: "placeholder_hidden_thunder",
      hint: "每逢雷雨，命盘外圈会有细小电光回旋。",
      rarity: "rare",
      tags: ["雷纹", "未揭示"],
      revealed: false
    },
    carriedItems: [
      {
        itemId: "placeholder_jade_half",
        name: "半枚旧玉",
        rarity: "common",
        description: "只作为 CCUI2 骨架占位，不参与真实资源投射。",
        tags: ["旧物", "占位"]
      },
      {
        itemId: "placeholder_bamboo_slip",
        name: "无字竹简",
        rarity: "uncommon",
        description: "详情抽屉滚动验证用的占位随身物。",
        tags: ["竹简", "占位"]
      }
    ],
    locks: {
      spiritualRoot: false,
      mainDestiny: false,
      secondaryDestiny0: false,
      secondaryDestiny1: false,
      flawDestiny: false,
      background: false,
      hiddenFate: false
    },
    attributeLock: false,
    spiritualRootLock: false,
    rerollCount: 0,
    divinationTokens: 1,
    createdAtMs: nowMs,
    updatedAtMs: nowMs
  };
}

function createPlaceholderOpeningInnateDraft(slotId: string): CharacterCreationDraft["openingInnateDraft"] {
  return {
    draftId: `${slotId}_ccui2_placeholder`,
    seed: `${slotId}:ccui2_placeholder`,
    rerollIndex: 0,
    archetype: {
      id: "ccui2_placeholder",
      name: "CCUI2 placeholder",
      description: "Layout placeholder only.",
      tags: ["archetype:placeholder"]
    },
    aptitude: {
      rootBone: 64,
      comprehension: 72,
      inspiration: 66,
      fortune: 58,
      heart: 76,
      lifespan: 61
    },
    coreSeed: { jing: 62, qi: 71, shen: 68 },
    spiritualRoot: {
      categoryId: "dual",
      displayName: "闆锋湪鐏垫牴",
      elements: { thunder: 52, wood: 48 },
      primaryElement: "thunder",
      secondaryElements: ["wood"],
      purity: 72,
      stability: 58,
      conflict: 34,
      breadth: 55,
      relationTags: [],
      tags: ["rootCategory:dual", "root:thunder", "root:wood", "mode:thunder", "mode:growth"]
    },
    growthBias: {
      jingGrowth: 1,
      qiGrowth: 1,
      shenGrowth: 1,
      studyBias: 1,
      martialBias: 1,
      alchemyBias: 1,
      artifactBias: 1,
      seclusionBias: 1,
      adventureBias: 1
    },
    tags: {
      destinyBiasTags: [],
      lifeEventBiasTags: ["archetype:placeholder"],
      modeBiasTags: ["mode:thunder", "mode:growth"],
      hiddenFateBiasTags: []
    },
    distinctivenessScore: 0
  };
}

function destiny(
  traitId: string,
  name: string,
  rarity: CharacterCreationRarity,
  tags: readonly string[],
  positiveEffects: readonly string[],
  negativeEffects: readonly string[]
): DestinyTraitState {
  return {
    traitId,
    name,
    rarity,
    tags,
    positiveEffects,
    negativeEffects
  };
}

function noop(): void {
  return undefined;
}
