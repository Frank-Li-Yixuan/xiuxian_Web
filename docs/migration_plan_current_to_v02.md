# 数据模型迁移计划 v0.1

## 1. 迁移目标

把当前实现中的 OAG/DT/HFO/LM/MLC/A18 v0.1 数据链升级为 SIM-REDESIGN 设计链：

```text
OpeningInnateDraft
  → NinePalaceEvaluation
  → DestinyEligibilityEvaluation
  → OriginFateNarrativeState
  → StorylineState
  → MonthlyEventV02
  → MajorChoiceV02
  → InterludeCandidate/Result
  → StageTransitionState
  → LifePlayableState
  → AdultNodeCandidate/Age18Resolution
```

## 2. 保留字段

| 当前字段 | 保留方式 |
|---|---|
| coreStats / aptitude | 保留，但加入 NinePalaceEvaluation |
| spiritualRoot | 保留，但加入 root support / wuxing inclination |
| destiny selection | 保留，但通过 DEM eligibility/mutation 重评估 |
| background origin | 保留，但升级为 origin storyline |
| hidden fate | 保留 trueName 内部字段，但 UI 永不泄露 |
| carried items | 保留，升级为 lifecycle + affinity |
| life monthly logs | 保留旧日志可读性，但新日志使用 v0.2 schema |

## 3. 废弃字段/弱化字段

| 字段/逻辑 | 处理 |
|---|---|
| 平铺随机天命 | 废弃，改为 eligibility/mutation |
| 纯随机月度事件 | 废弃，改为 storyline/density weighted |
| 简单半年选择 | 废弃，改为 MC2 风险/隐藏分支 |
| 18 岁硬切域外 | 弱化，改为成年节点路径评分 |

## 4. 迁移步骤

### Step A：只读盘点

执行 `SIM-C001`，生成当前实现状态和迁移清单。

### Step B：Schema 并存

新旧数据结构并存，不立即删除旧结构。

```text
profile.characterOrigin.v1
profile.lifeSimulation.v1
profile.simRedesign.v2
```

### Step C：写适配器

创建：

```text
src/life/migration/ProfileToSimRedesignAdapter.ts
```

作用：将旧 profile 转成新 `SimRedesignState`。

### Step D：新链路优先

新建存档走新链路。旧存档只读兼容。

### Step E：旧 prompt 冻结

旧 LM/MLC/A18 prompt 只作为参考，不继续执行。

## 5. 数据版本标记

建议 Profile 加：

```ts
profile.schemaVersion = "sim-redesign-v0.1";
profile.simRedesignVersion = "0.1";
```
