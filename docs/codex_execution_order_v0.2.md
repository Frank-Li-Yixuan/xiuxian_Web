# Codex 执行顺序 v0.2

建议按以下 8 步执行。

---

## ME2-C001：数据 Schema 与 Registry

接入：

```text
monthly_event_categories.v0.2.json
monthly_event_tiers.v0.2.json
monthly_event_pool.v0.2.json
narrative_density_rules.v0.2.json
monthly_event_weighting_rules.v0.2.json
storyline_event_mapping.v0.2.json
```

---

## ME2-C002：月度事件池升级

将旧 v0.1 monthly event pool 升级为 v0.2 schema，并保持兼容迁移。

---

## ME2-C003：权重选择器 v2

实现：

```text
条件筛选
权重公式
标签加成
九宫加成
主线加成
密度调整
冷却/重复惩罚
```

---

## ME2-C004：叙事密度控制器

实现：

```text
六个月密度窗口
hardEventBudget
category repetition penalty
interlude candidate budget
main storyline starvation protection
```

---

## ME2-C005：主线 / 阶段 / 插曲集成

接入：

```text
LifeStorylineState
LifeStageState
interludeCandidate
stageTransitionSignal
```

---

## ME2-C006：事件效果应用与日志 v2

实现：

```text
visibleEffects
hiddenEffects
hidden trueName 不泄露
日志压缩
快速推演模式日志
```

---

## ME2-C007：LLM 文案 hook 预留

不真正接 DeepSeek，只定义：

```text
llmBrief
template fallback
structured event prompt input
```

DeepSeek 实现放到第 10 次文档。

---

## ME2-C008：Dev Page 与测试遥测

实现：

```text
/dev/monthly-events-v2
216 个月快速推演
事件分布
密度曲线
主线推进
hook 输出
隐藏泄露检测
```
