# 系统集成规格 v0.1

## 1. 输入系统

Life Simulation 首版读取：

```text
CharacterOriginState
NinePalaceEvaluation
DestinyEligibility / Mutation result
OriginFateNarrativeState
LifeStorylineState
LifeStageState
```

## 2. 输出系统

首版至少输出：

```text
LifeSimulationResultDraft
monthlyLogs
majorChoiceRecords
interludeRecords
stageSummaries
lifeStatsFinal
storylineFinalState
hiddenFateNarrativeState
carriedItemLifecycleState
age18CandidateHooks
```

## 3. 与 A18 的边界

本包不要求完整 18 岁转化实现。只需要当 `ageMonths >= 216` 时生成：

```ts
AdultNodeCandidate
```

后续 A18 系统读取它。

## 4. 与 STG 插曲的边界

玩法插曲用统一协议：

```ts
LifeInterludeRunConfig
LifeInterludeResult
```

如果某玩法未实现：

```text
auto-resolve
planned
fallback text check
```

## 5. 与 LLM 的边界

首版可先调用：

```text
NarrativeService.renderMonthlyLog()
NarrativeService.renderChoiceIntro()
NarrativeService.renderStageSummary()
```

默认使用 fallback 模板。真实 DeepSeek API 作为 optional。
