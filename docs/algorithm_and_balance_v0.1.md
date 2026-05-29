# 算法与数值平衡 v0.1

## 1. 设计目标

18 岁转化必须满足：

```text
人生模拟结果可解释
极端开局有戏剧性
第一战不被数值直接碾压
失败不惩罚过重
战后能自然开启洞府
```

---

## 2. 觉醒评分 Awakening Score

18 岁时生成一个综合评分，只用于调试和 UI 摘要，不直接决定强弱。

```text
awakeningScore =
  coreScore × 0.28
  + aptitudeScore × 0.25
  + destinyScore × 0.16
  + hiddenFateScore × 0.12
  + carriedItemScore × 0.08
  + lifeChoiceScore × 0.07
  + karmaMeritScore × 0.04
```

评分等级：

| 分数 | 显示 |
|---:|---|
| 0–39 | 命途艰难 |
| 40–59 | 凡命入道 |
| 60–74 | 小有仙缘 |
| 75–89 | 资质不凡 |
| 90–109 | 天命初显 |
| 110+ | 逆天之姿 |

注意：评分高不一定安全。高评分可能来自强天命 + 高劫数。

---

## 3. 属性转化公式

先对属性做软上限：

```ts
function softCap(value: number, cap = 120, softness = 0.45): number {
  if (value <= cap) return value;
  return cap + (value - cap) * softness;
}
```

第一战使用的有效属性：

```text
effJing = softCap(jing)
effQi = softCap(qi)
effShen = softCap(shen)
effRootBone = softCap(rootBone)
effComprehension = softCap(comprehension)
effInspiration = softCap(inspiration)
effFortune = softCap(fortune)
effHeart = softCap(heart)
```

### 3.1 第一战战斗属性

```text
maxHp = 80 + effJing × 2.6 + effRootBone × 0.7
maxQi = 60 + effQi × 3.0 + effComprehension × 0.45
pickupRadius = 85 + effShen × 1.25 + effInspiration × 0.35
critChance = 3% + effShen × 0.045% + effComprehension × 0.025%
passiveQiRegen = 0.8 + effQi × 0.018 + effHeart × 0.006
spellInsightBonus = effComprehension × 0.25 + effInspiration × 0.2
dropLuckBonus = effFortune × 0.18
heartDemonResist = effHeart × 0.35 + merit × 0.08
```

### 3.2 建议结果范围

普通 18 岁：

```text
maxHp: 220–420
maxQi: 180–420
pickupRadius: 140–260
critChance: 6%–12%
```

极端角色：

```text
maxHp: 可到 500+
maxQi: 可到 500+
但第一战敌人和时长仍按新手控制
```

---

## 4. 伤病与心结修正

| 状态 | 计算 |
|---|---|
| 小伤 | maxHp -3%，持续第一战 |
| 重伤 | maxHp -10%，移速 -3% |
| 旧疾 | maxHp -8%，丹药效果 +10% 或 -10%，视来源 |
| 心结 | 法术冷却 +3%，心魔事件权重 + |
| 初战恐惧 | 第一战前 30 秒真元回复 -5% |
| 心魔种子 | 第一战可能出现一次幻弹 |

上限：所有负面状态叠加不应让 maxHp 低于基础值 80 的 1.4 倍。

---

## 5. 功德 / 业力修正

### 功德

```text
meritShieldChance = clamp(merit × 0.4%, 0%, 25%)
meritRewardBonus = clamp(merit × 0.2%, 0%, 15%)
```

第一战中，如果功德较高：

```text
首次濒死时有概率出现“善缘护命”
战后洞府初始稳定度 +
```

### 业力

```text
karmaDangerBonus = clamp(karma × 0.3%, 0%, 30%)
karmaRewardBonus = clamp(karma × 0.18%, 0%, 18%)
```

业力高：

```text
敌人更凶
掉落略好
可能出现追索因果的特殊敌人
```

---

## 6. 隐藏命揭示算法

```text
baseChance = revealBandChance(progressBand)
+ inspirationBonus
+ fortuneBonus
+ matchedDestinyBonus
+ matchedItemBonus
+ age18HookBonus
- sealPenalty
```

```text
inspirationBonus = inspiration >= 90 ? 8 : inspiration >= 75 ? 4 : 0
fortuneBonus = fortune >= 90 ? 6 : fortune >= 75 ? 3 : 0
matchedDestinyBonus = hasMatchingDestiny ? 12 : 0
matchedItemBonus = hasMatchingCarriedItem ? 10 : 0
age18HookBonus = numberOfMatchingHooks * 4, max 16
sealPenalty = hiddenFate has sealed tag ? 8 : 0
```

结果：

```text
roll <= finalChance → revealed 或 halfAwakened
roll > finalChance → sealed
```

如果 progress >= 100，强制至少 halfAwakened。

---

## 7. 随身物转化算法

每个随身物有多个 possibleConversion。

选择权重：

```text
conversionWeight =
  baseWeight
  + affinityBonus
  + hiddenFateMatchBonus
  + destinyMatchBonus
  + originMatchBonus
  + lifeEventHookBonus
```

亲和度：

```text
affinity 0–29: 仅普通转化
affinity 30–69: 可触发良好转化
affinity 70–99: 高概率高级转化
affinity 100+: 稀有转化
```

示例：残破木剑

```text
普通：开局飞剑伤害 +5%
良好：获得青霜飞剑·残
高级：青霜飞剑·残 + 剑魄线索
稀有：前世剑魄半觉醒
```

---

## 8. 第一战难度调节

第一战不是传统难度关，而是新手验证。

### 8.1 基础难度

```text
时长：3–5 分钟
普通敌人峰值：15–30
小 Boss 时长：45–75 秒
顿悟：1 次强制，第二次可选
死亡：允许失败后重试
```

### 8.2 根据角色修正

| 条件 | 调整 |
|---|---|
| maxHp 很低 | 敌弹速度 -5%，掉落回春丹概率 + |
| 天妒英才 | 高危预警 +1，但奖励品质 + |
| 苟道至尊 | 低压前期更长，存活奖励 + |
| 魔心暗种 | 加入一次心魔幻弹，奖励略好 |
| 业力高 | 精英更强，掉落更好 |
| 功德高 | 首次濒死保护 |

### 8.3 禁止事项

```text
不要因为强命格把第一战变成秒杀。
不要因为负命格让玩家无法通过。
不要随机删除人生模拟结果。
```

---

## 9. 战后洞府开启奖励预算

第一战成功后给：

```text
系统家园核心
下品灵石 80–160
战场残晶 3–8
随机基础材料 2–5
根据随身物 / 身世给一个模块小加成
```

不建议给太多高级资源。洞府应该从“草创”开始成长。

---

## 10. 遥测指标

实现后记录：

```text
awakeningScore
revealedHiddenFateCount
convertedItemTier
firstBattleMaxHp
firstBattleMaxQi
firstBattleFailureCount
firstBattleClearTime
firstBattleDeathReason
homeUnlockBonuses
```

用于后续调参。
