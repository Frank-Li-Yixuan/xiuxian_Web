# 与人生模拟系统的集成 v0.1

## 月度事件

规则层输出：

```ts
MonthlyEventSelectionResultV02
```

叙事层输入：

```ts
NarrativeTaskType = "monthly_event_log"
```

LLM 或模板只生成日志文本。

## 半年选择

规则层生成：

```ts
PendingMajorChoiceStateV02
```

叙事层任务：

```text
major_choice_intro
major_choice_options
```

LLM 可润色选择描述，但不能改选项 ID、风险等级、成功判定、effects。

## 玩法插曲

插曲开始前：

```text
interlude_intro
```

插曲结束后：

```text
interlude_result
```

LLM 可描述“你如何从梦中醒来”“村人如何看你”，但战斗胜负和奖励由玩法结果决定。

## 阶段转化

```text
stage_transition_summary
```

用于凡人孩童 → 求道苗子、半修行者、入道候选等阶段变化。

## 18 岁与人生小传

```text
age18_awakening_log
life_chronicle_summary
```

18 岁日志可以更有仪式感。人生小传用于存档回看和角色详情。
