# 目标架构 v0.1

## 1. 创建角色链路

```text
CharacterCreationController
  ├─ OpeningGenerator
  ├─ NinePalaceEvaluator
  ├─ SpiritualRootGenerator
  ├─ DestinyEligibilityEvaluator
  ├─ DestinyMutationResolver
  ├─ OriginFateNarrativeEngine
  └─ CharacterCreationViewModelBuilder
```

## 2. 人生模拟链路

```text
LifeSimulationController
  ├─ LifeStageEngine
  ├─ StorylineScoringEngine
  ├─ EventThreadEngine
  ├─ MonthlyEventSelectorV02
  ├─ NarrativeDensityController
  ├─ MajorChoiceGeneratorV02
  ├─ InterludeTriggerEngine
  ├─ InterludeRunConfigFactory
  ├─ InterludeResultWritebackEngine
  ├─ NarrativeService
  └─ LifePlayableViewModelBuilder
```

## 3. 成年节点链路

```text
AdultNodeController
  ├─ AdultPathScorer
  ├─ Age18AwakeningResolver
  ├─ HiddenFateRevealResolver
  ├─ CarriedItemConversionResolver
  ├─ TrialRunConfigFactory
  └─ HomeUnlockPlanner
```

## 4. UI 层

```text
src/app/screens/
  MainMenuScreen
  SaveSlotScreen
  CharacterCreationScreen
  LifeSimulationScreen
  AdultNodeScreen
  OutgameHomeScreen

src/app/ui-system/
  XianxiaButton
  XianxiaPanel
  XianxiaDialog
  XianxiaTabs
  XianxiaScrollArea
  XianxiaBadge
```

## 5. 不允许耦合

```text
LifeSimulationController 不读 DOM
NarrativeService 不改数值
UI 不直接运行 RNG
STG 不再读 debug_run_config 作为正式入口
src/sim 不依赖 app/ui-system 或 llm
```

## 6. 保存阶段

```ts
type ProfileStage =
  | "main_menu"
  | "character_creation"
  | "life_simulation"
  | "major_choice_pending"
  | "interlude_pending"
  | "adult_node_pending"
  | "trial_pending"
  | "dongfu_unlocked";
```
