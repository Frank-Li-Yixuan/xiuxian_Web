# 《生成算法升级 v0.1》

## 1. 旧流程问题

旧流程：

```text
随机命盘类型
随机属性
随机灵根
随机天命
随机身世
```

问题：

```text
属性、灵根、天命、身世之间因果弱。
强天命可能落在不支撑它的命盘上。
人生模拟事件权重缺少解释。
```

---

## 2. 新流程

新流程：

```text
1. rollAttributeArchetype
2. generateNineAttributes
3. derivePalaceScores
4. deriveWuxingInclinations
5. deriveCausalityTags
6. generateSpiritualRootWithAttributeSupport
7. generateDestinyCandidatesByEligibility
8. applyAntiWeirdnessRulesAndMutations
9. generateOriginFateAndItems
10. buildCharacterCreationViewModel
```

---

## 3. 先属性，后命理标签

九宫属性生成后，不直接进入 UI，而先生成：

```text
threePowers
derivedScores
wuxingInclination
causalityTags
```

示例：

```json
{
  "threePowers": {
    "heaven": 92,
    "human": 51,
    "earth": 34
  },
  "derived": {
    "talentScore": 94,
    "vesselScore": 44,
    "destinyPressureScore": 88
  },
  "tags": [
    "aptitude:talent_high",
    "aptitude:lifespan_low",
    "fate:heaven_pressure_high",
    "destinyBias:heaven_jealous_talent"
  ]
}
```

这时再抽天命，天妒英才就合理了。

---

## 4. 灵根也受命盘影响

灵根不是纯表：

```text
抽灵根类型
抽元素
```

而是：

```text
九宫 → 五行倾向 → 灵根权重
```

例子：

```text
根骨高 + 神高 + 悟性高 → 金倾向
气高 + 悟性高 → 火倾向
神高 + 灵感高 → 阴/水倾向
灵感高 + 气运高 → 雷倾向
```

---

## 5. 天命生成策略

### 5.1 候选池

先按品质和权重生成候选池，但不要立即确定。

```text
candidatePool = weightedPickMany(traits, 12)
```

### 5.2 资格检查

对每个候选：

```text
eligibleScore
supportScore
contradictionScore
mutationTarget
```

### 5.3 选择策略

优先：

```text
eligible 且 supportScore 高
```

如果候选强度很高但 contradictionScore 高：

```text
尝试 mutation
```

如果没有足够候选：

```text
fallback 到中正/良命/奇命
```

---

## 6. 重 Roll 与锁定

锁定项优先保留。

如果锁定组合让新候选难以生成：

```text
最多尝试 40 次
仍失败 → 显示“天机混乱，请解除部分锁定”
```

不要悄悄破坏锁定。

---

## 7. Debug 输出

每次生成应输出 debug：

```ts
interface FateGenerationDebug {
  archetypeId: string;
  ninePalaceScores: Record<string, number>;
  causalityTags: string[];
  destinyCandidates: {
    traitId: string;
    eligible: boolean;
    supportScore: number;
    contradictionScore: number;
    mutationTarget?: string;
  }[];
  selectedDestinies: string[];
  mutations: AntiWeirdnessResult[];
}
```

开发页可显示。

---

## 8. 验收

实现后应满足：

```text
悟性/灵感低的角色不会直接出现天妒英才。
若出现“天妒类”结果，应变异为妄承天机。
废灵逆命更常见于低根骨/杂灵根/高心性。
苟道至尊更常见于高心性/高寿元。
雷系天命更常见于雷倾向命盘。
同 seed 可复现。
```
