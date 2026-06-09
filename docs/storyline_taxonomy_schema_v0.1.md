# 《人生主线分类与事件线 Schema v0.1》

## 1. Life Storyline

```ts
interface LifeStorylineDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  themeTags: string[];
  worldContextTags: string[];
  agePhaseAffinity: Record<LifePhaseId, number>;
  baseWeight: number;
  activationSignals: StorylineSignalRule[];
  suppressionSignals?: StorylineSignalRule[];
  eventThreadIds: string[];
  playInterludeAffinities: PlayInterludeAffinity[];
  possibleTransitionHooks: string[];
  possibleAge18Hooks: string[];
}
```

## 2. Event Thread

```ts
interface EventThreadDefinition {
  id: string;
  storylineId: string;
  name: string;
  description: string;
  threadTags: string[];
  stageSequence: EventThreadStageDefinition[];
  triggerSignals: StorylineSignalRule[];
  monthlyEventHooks: string[];
  majorChoiceHooks: string[];
  playInterludeHooks: string[];
  resolutionHooks: string[];
  failureHooks: string[];
}
```

## 3. Thread Stage

```ts
interface EventThreadStageDefinition {
  stage: "seed" | "omen" | "development" | "crisis" | "resolution";
  recommendedAgeRange: [number, number];
  requiredProgress?: number;
  tensionDelta?: number;
  clarityDelta?: number;
  riskDelta?: number;
  monthlyEventTags: string[];
  majorChoiceTags: string[];
  visibleNarrativeHints: string[];
  hiddenHooks?: string[];
}
```

## 4. Signal Rule

Signal rule 用于根据命盘和人生状态计算主线权重：

```ts
interface StorylineSignalRule {
  source:
    | "ninePalace"
    | "spiritualRoot"
    | "destiny"
    | "origin"
    | "hiddenFate"
    | "carriedItem"
    | "lifeState"
    | "recentMonthlyEvents"
    | "majorChoiceOutcome";
  tag?: string;
  stat?: string;
  min?: number;
  max?: number;
  weight: number;
  note?: string;
}
```

## 5. Hook 输出

主线系统必须只输出 hook，不直接执行效果。

```ts
interface StorylineHook {
  id: string;
  sourceStorylineId: string;
  sourceThreadId?: string;
  weight: number;
  tags: string[];
  visibility: "visible" | "hidden" | "debugOnly";
}
```

## 6. 状态数据

```ts
interface StorylineProgress {
  storylineId: string;
  score: number;
  status: "dormant" | "hinted" | "active" | "dominant" | "fated";
  lastUpdatedMonth: number;
  tags: string[];
}

interface EventThreadProgress {
  threadId: string;
  storylineId: string;
  stage: "notStarted" | "seeded" | "hinted" | "developing" | "crisis" | "resolved" | "failed" | "dormant";
  progress: number;
  tension: number;
  clarity: number;
  risk: number;
  flags: Record<string, boolean | number | string>;
  lastEventMonth?: number;
}
```

## 7. UI 显示原则

人生模拟 UI 不应该直接显示：

```text
药铺丹道线 score=72
系统前兆线 score=51
```

而应显示为：

```text
近期倾向：药理与火候相关事件渐多。
近期异象：你偶尔听见耳边有断续杂音。
```

Debug 页面可以显示精确分数。
