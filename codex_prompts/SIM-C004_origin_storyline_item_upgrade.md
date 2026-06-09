# SIM-C004：身世、隐藏命与随身物叙事链升级

## 目标

把 HFO 从一次性生成升级为叙事链：

```text
OriginStorylineState
HiddenFateNarrativeState
CarriedItemLifecycleState
RevealMisdirectionState
```

## 硬约束

- 创建页、月度日志、半年选择不得显示 hidden trueName。
- 不修改 `src/sim/**`。
- 不恢复旧 PNG 控件。

## 任务

1. 实现隐藏命阶段：

```text
seeded → omen → misleading → stirring → halfReveal → nearAwake → revealed / unstable / sealed
```

2. 实现随身物生命周期：

```text
obtained → noticed → resonating → tested → damaged → deepened → converted → inherited
```

3. 实现身世事件线：

```text
earlyEcho
childhoodSeed
youthConflict
teenChoice
```

4. 实现身世 + 隐藏命 + 随身物共鸣规则。

5. 输出给月度事件和半年选择的 tags：

```text
lifeEventBiasTags
majorChoiceSignals
interludeBiasTags
stageTransitionTokens
age18Hooks
```

## 测试

- 所有 visible 文本不含 trueName。
- 随身物 lifecycle 可推进。
- 共鸣规则可提高隐藏命进度。
- 同 seed 可复现。

## 命令

```text
npm run typecheck
npm test
npm run build
```
