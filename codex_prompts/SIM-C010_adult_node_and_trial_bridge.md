# SIM-C010：成年节点与首个试炼桥接

## 目标

将 216 月后的 `adult_node_pending` 接到成年节点解析与首个试炼/洞府桥接。

## 设计原则

18 岁不是唯一硬切域外战场。成年节点应生成路径候选：

```text
系统征召：域外战场
入道试炼：凡域入道
灾劫清算：守护/逃亡
血脉觉醒：内劫
隐修延后：预留
```

v0.1 可 fallback 到域外战场第一战，但结构必须支持多路径。

## 任务

1. 实现 AdultNodeResolver。
2. 输入：
   - LifeSimulationState
   - StorylineState
   - StageState
   - Interlude history
   - OriginFateNarrativeState
   - DestinySelectionV2
3. 输出：
   - adultPathScores
   - recommendedPath
   - warnings
   - trialBridgeConfig
4. 如果推荐路径是 outer_battlefield，则调用 OuterBattlefieldIntroRunConfigFactory。
5. 若试炼未实现，进入 TrialPending placeholder。
6. 成功后可进入 SystemHomeUnlockPlan。
7. 不重复解析：已有 AdultNodeResolution 时直接读取。

## 验收

- 216 月后进入 adult node。
- 同 seed 可复现。
- 不强制所有角色域外。
- fallback 到域外可用。
- 不读 debug_run_config 作为正式第一战输入。

## 命令

```text
npm run typecheck
npm test
npm run build
```
