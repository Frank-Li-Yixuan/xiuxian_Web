# 《Integration Test Plan v0.1》

本计划定义 First Playable 的自动化、半自动化和人工测试范围。

---

## 1. 测试分层

| 层级 | 目标 | 工具 |
|---|---|---|
| Unit | 单系统纯逻辑 | Vitest |
| Content | JSON 数据合法性 | validate:data |
| Headless Integration | 不渲染跑局内闭环 | Vitest / Node |
| Determinism | 同 seed 同输入 hash 一致 | Two-client harness |
| UI Snapshot | ViewState 到 HUD 显示 | DOM/Canvas test optional |
| VFX Readability | 特效不遮挡关键层级 | Manual + Debug overlay |
| Outgame Integration | Receipt 到第二局 RunConfig | Vitest |
| Playtest | 人工体验 | 报告模板 |

---

## 2. Unit Tests

### 2.1 RNG

- 同 seed 输出一致。
- 不同 stream 输出互不影响。
- visualRng 消耗不改变 gameplay hash。

### 2.2 FixedTickRunner

- 推进 60 frame 等于 1 秒 gameplay。
- 暂停 insight 时战斗模拟冻结。
- 恢复 frame 一致。

### 2.3 PlayerSystem

- 移动边界限制。
- 斜向归一化。
- 专注模式速度倍率。
- 受击、无敌、死亡状态。

### 2.4 ArtifactSystem

- 青霜飞剑射速和弹道。
- 紫阳葫芦扇形弹道。
- 玄岳重印延迟砸落。

### 2.5 SpellSystem

- 真元不足不能释放。
- 冷却期间不能释放。
- 五雷连锁目标稳定。
- 八卦剑阵清普通弹。
- 红莲业火持续伤害。
- 袖里乾坤吸弹反击。

### 2.6 PillDigestionSystem

- 回春丹每 tick 恢复。
- 燃血丹 buff 和虚弱。
- 清心丹移除 debuff。
- 小破境丹只增加 cultivation。

### 2.7 TeamInsightSystem

- 灵气经验阈值。
- maxInsightPausesPerSegment。
- rewardRng 稳定。
- 重 Roll 消耗公共气运。

### 2.8 CultivationSystem

- 周天吐纳增长。
- 小层突破奖励。
- 大境界瓶颈。
- 雷劫触发队列。

---

## 3. Content Tests

必须检查：

```text
所有 JSON 可 parse。
所有 id 唯一。
所有 reference id 存在。
所有数值字段类型正确。
所有 cooldown/duration 都转换为 frame。
所有 reward pool item 都能找到定义。
所有 drop table 都有 fallback。
```

---

## 4. Headless Integration Tests

### H001：Stage 1-1 Smoke

```text
Run 60 seconds scripted input.
Expected: segment ends, insight pending, player alive.
```

### H002：Full Stage 01 Clear

```text
Run deterministic skilled script.
Expected: boss dead, settlement receipt produced.
```

### H003：Full Stage 01 Death

```text
Run no-dodge script.
Expected: players dead/soul, settlement receipt produced with partial resources.
```

### H004：Insight Pause Resume

```text
Force insight.
Apply P1/P2 choices.
Resume.
Expected: frame resumes and state hash stable.
```

### H005：Tribulation Debug

```text
Force bottleneck.
Trigger tribulation.
Survive scripted path.
Expected: breakthrough applied, screen clear event emitted.
```

---

## 5. Determinism Tests

| 测试 | 标准 |
|---|---|
| Same client replay | 同输入重跑 3 次，hash 一致 |
| Two-client mock | 双模拟同 seed 同输入，10 分钟 0 mismatch |
| Visual RNG consumption | 增加粒子消耗不改变 gameplay hash |
| Insight simultaneous reroll | 双方同帧重 Roll，排序一致 |
| Rescue hold input | 救援进度双方一致 |
| Tribulation target | 雷劫落点双方一致 |

---

## 6. Outgame Integration Tests

### O001：Settlement Receipt Apply

```text
Default profile + stage01 clear receipt.
Expected: wallet resources increase, unlock flags update.
```

### O002：Alchemy

```text
Use gained herbs to craft pill_rejuvenation.
Expected: resources decrease, pill inventory increase.
```

### O003：Artifact Upgrade

```text
Upgrade qingshuang sword to star 2.
Expected: resource cost paid, artifact star=2.
```

### O004：Cultivation Method Training

```text
Collect idle yield, apply to sharp metal method.
Expected: method progress increases.
```

### O005：Generate Second RunConfig

```text
Build loadout from upgraded profile.
Expected: run config references valid upgraded items.
```

---

## 7. UI/VFX Manual Checks

### UI

- 灵气经验条与修为条颜色、位置、文案不同。
- 法术不足真元和冷却状态可读。
- 丹药炼化状态可读。
- 顿悟选项类型、稀有度、替换/升级标识清楚。
- 神魂/救援状态清楚。

### VFX

- 自机判定点在所有特效中可见。
- 敌弹白芯在红莲业火中可见。
- 雷劫红圈高于普通法术层。
- Boss 死亡白闪不造成持续不可读。
- 低配模式降粒子后 gameplay 不变。

---

## 8. Performance Checks

| 场景 | 标准 |
|---|---|
| 1-1 | 60 FPS 稳定 |
| 1-4 怪潮 | 目标 60 FPS，短暂波动可接受 |
| Boss Phase 3 | 不因粒子爆炸长时间掉帧 |
| 雷劫 + Boss | 雷劫预警仍然清晰 |
| Headless | 明显快于实时 |

---

## 9. 测试完成标准

First Playable RC 前必须：

```text
Unit tests 全过。
Content tests 全过。
Headless full stage clear/death 全过。
Same-seed replay 全过。
Outgame integration 全过。
Manual UI/VFX checklist 通过。
阻塞级 bug 为 0。
```
