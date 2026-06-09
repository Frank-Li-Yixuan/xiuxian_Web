# 与玩法插曲、人生模拟、18 岁系统的集成 v0.1

## 1. 与 LifeSimulationState 集成

新增字段建议：

```ts
interface LifeSimulationState {
  stage: LifeStageState;
}
```

`LifeStageState` 包含：

```text
agePhaseId
identityStageIds
initiationReadiness
systemResonance
karmicPressure
worldlyAttachment
transitionTokens
cooldowns
pendingStageTransition
age18PathScores
```

## 2. 与月度事件系统集成

月度事件可输出：

```text
stageToken
transitionToken
identityBias
systemOmen
initiationHook
```

例如：

```text
梦中丹炉 → token: artifact_resonance_hint
雷雨骨痛 → token: bloodline_stirring_hint
耳边杂音 → token: system_static
```

## 3. 与半年选择系统集成

半年选择选项可声明：

```text
stageEffects
transitionTokens
initiationNodeCandidate
```

例如：

```text
偷偷前往后山
→ onSuccess: stg_rain_mountain_success, first_qi_sense +1
→ onFailure: interlude_failure_fright
```

## 4. 与玩法插曲系统集成

玩法插曲 `LifeInterludeResult` 输出：

```ts
transitionTokens: string[];
stageEffects: LifeStageEffect[];
initiationNodeResults: InitiationNodeResult[];
```

阶段系统消费这些 tokens。

## 5. 与人生主线系统集成

事件线状态会影响阶段：

| thread state | 作用 |
|---|---|
| seeded | 可触发轻量预兆 |
| hinted | 增加身份转化权重 |
| developing | 增加相关玩法插曲 |
| crisis | 可触发阶段选择或入道节点 |
| resolved | 可生成 age18Hook |
| failed | 可能生成心结或延后入道 |

## 6. 与 18 岁系统集成

18 岁系统不直接读全部人生历史，而读 `LifeStageState` 和核心结果：

```text
identityStageIds
initiationReadiness
systemResonance
karmicPressure
worldlyAttachment
hiddenFateProgress
age18Hooks
transitionTokens
majorStorylineOutcomes
```

然后决定成年路径。

## 7. 与 UI 集成

LifeSimulationScreen 需要增加：

```text
年龄阶段显示
修行身份显示
入道机缘条
系统前兆条
当前主线张力
阶段转化提示
成年节点路径预览，17 岁后可见
```

推荐文案：

```text
你似乎已经不再只是凡人。
体内偶有清凉气息流转，却又难以捕捉。

[顺其自然]
[压下异象]
[主动探寻]
```

## 8. 与存档恢复集成

`pendingStageTransition` 和 `pendingAge18Resolution` 必须持久化。刷新页面后不能重新抽取成年路径或入道节点。
