# 玩法插曲分类与数据 Schema v0.1

## 1. 插曲模式分类

```ts
type LifeInterludeMode =
  | "stg"
  | "horde"
  | "deckbuilder"
  | "formation_auto"
  | "text_check";
```

## 2. 插曲真实性包装

```ts
type InterludeRealityLayer =
  | "real_event"       // 真实发生
  | "dream"            // 梦境
  | "training"         // 训练/试炼
  | "spirit_projection"// 灵识投影
  | "system_preview";  // 系统预演
```

## 3. 风险等级

| 等级 | 说明 | 可触发年龄 |
|---|---|---|
| safe | 安全试炼 | 4+ |
| steady | 稳健选择 | 4+ |
| risky | 有风险 | 9+ |
| dangerous | 明显危险 | 14+ |
| forbidden | 禁忌 | 14+，需条件 |
| destiny | 命格/隐藏专属 | 根据条件 |

## 4. 核心接口

```ts
interface LifeInterludeDefinition {
  id: string;
  name: string;
  mode: LifeInterludeMode;
  realityLayer: InterludeRealityLayer;
  ageRange: [number, number];
  baseWeight: number;
  storylineTags: string[];
  threadTags: string[];
  requiredHooks?: string[];
  preferredRoots?: string[];
  preferredDestinies?: string[];
  preferredOrigins?: string[];
  preferredItems?: string[];
  difficultyTier: InterludeDifficultyTier;
  durationTargetSeconds?: number;
  turnLimit?: number;
  description: string;
  worldExplanation: string;
  rewardProfileId: string;
  failurePolicyId: string;
  resultWritebackId: string;
}
```

## 5. 触发上下文

```ts
interface LifeInterludeTriggerContext {
  ageMonth: number;
  phaseId: string;
  recentMonthlyEventIds: string[];
  recentHooks: string[];
  activeStorylines: StorylineProgressSnapshot[];
  activeThreads: EventThreadProgressSnapshot[];
  openingTags: string[];
  destinyTags: string[];
  rootTags: string[];
  originTags: string[];
  itemTags: string[];
  hiddenFateBands: Record<string, string>;
  currentWounds: string[];
  currentHeartKnots: string[];
  merit: number;
  karma: number;
  interludeHistory: LifeInterludeHistorySummary;
}
```

## 6. 插曲结果

```ts
interface LifeInterludeResult {
  interludeRunId: string;
  definitionId: string;
  mode: LifeInterludeMode;
  outcome: "failure" | "partialSuccess" | "success" | "greatSuccess" | "hiddenSuccess" | "abandon";
  score?: number;
  durationSeconds?: number;
  playerChoseManual: boolean;
  visibleSummary: string;
  effects: LifeInterludeWritebackEffect[];
  generatedHooks: string[];
}
```

## 7. 设计约束

- 插曲不能直接绕过半年选择系统。
- 插曲结果必须以 `LifeInterludeResult` 回写。
- 插曲内部玩法可以临时实现，但输出契约必须稳定。
- 插曲不能泄露隐藏命真名。
- 插曲不能破坏同 seed 可复现性。
