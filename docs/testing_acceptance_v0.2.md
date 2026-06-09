# 测试与验收 v0.2

## 1. 数据校验

必须通过：

```text
node scripts/validate_monthly_events_v02.mjs
```

检查：

```text
事件 id 唯一
category 存在
tier 存在
ageMonthRange 合法
baseWeight > 0
隐藏效果不得包含 visibleText
interludeCandidate 格式正确
stageTransitionSignal 格式正确
```

## 2. 确定性测试

同 seed、同角色、同月数：

```text
216 个月结果完全一致
```

## 3. 叙事密度测试

100 个随机角色完整模拟：

```text
每 6 个月 hard events 不超过预算
每年 interlude candidates 在合理范围
至少 80% 角色有 1 条 active 主线推进
系统前兆线不应人人 active
```

## 4. 隐藏泄露测试

可见日志和 UI 文本不得包含：

```text
古雷真血
丹圣遗骨
系统共鸣体
前世剑魄
魔印微痕
```

除非该隐藏命已被正式揭示。

## 5. 差异化测试

预设角色：

```text
药铺学徒 + 木火灵根 + 丹道奇才
破落修士之后 + 残破木剑 + 前世剑魄
阴灵根 + 守墓人之子 + 太阴残脉
山村孤儿 + 雷灵根 + 天妒英才
苟道至尊 + 高心性高寿元
```

应产生明显不同事件分布。

## 6. 验收标准

实现通过后应满足：

```text
1. 事件不再像随机流水账。
2. 月度事件明显受命盘、天命、身世、主线影响。
3. 玩法插曲不会过频。
4. 主线长期不推进时会自动提升相关事件权重。
5. 18 岁 hook 能自然积累。
6. 事件日志不泄露隐藏真名。
7. 快速推演可压缩轻事件。
```
