# 与月度事件、主线、玩法插曲、阶段转化的集成 v0.2

## 1. 月度事件 → 半年选择

月度事件产生：

```text
hooks
sourceMonthlyEventIds
threadProgress
threadTension
interludeCandidate
transitionSignal
hiddenOmen
```

半年选择系统读取最近 6 个月窗口：

```ts
interface SixMonthWindowSummary {
  monthStart: number;
  monthEnd: number;
  logIds: string[];
  hooks: string[];
  dominantCategories: string[];
  pressureCount: number;
  omenCount: number;
  choiceSeeds: string[];
  transitionSeeds: string[];
  interludeCandidates: string[];
}
```

## 2. 人生主线 → 半年选择

如果某主线：

```text
active / dominant / fated
```

则对应选择事件权重提高。

如果某事件线进入：

```text
crisis
```

则系统应优先生成相关重大选择。

## 3. 玩法插曲 → 半年选择

半年选择的某个 option 可以包含：

```text
interludeCandidateId
```

点击后进入插曲简报：

```text
手动挑战
自动推演
返回重选
```

插曲结果回写选择 outcome。

## 4. 阶段转化 → 半年选择

选择可以生成：

```text
stageToken
initiationNodeProgress
identityStageScore
```

阶段转化系统决定是否变化身份阶段。

## 5. 18 岁 hook

半年选择结果可以写：

```text
age18Hook
outerBattlefieldBias
systemResonance
dongfuUnlockHint
```

后续 18 岁系统读取这些数据。

## 6. LLM 文案 hook

半年选择可以输出结构化提示给 LLM：

```json
{
  "type": "major_choice_log",
  "eventId": "...",
  "selectedOptionId": "...",
  "outcomeBand": "greatSuccess",
  "mustNotReveal": ["hidden_fate_ancient_thunder_blood"],
  "tone": "mysterious"
}
```

LLM 只生成文本，不改变数值。
