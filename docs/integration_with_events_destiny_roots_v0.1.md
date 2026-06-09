# 《与灵根、天命、人生事件的集成 v0.1》

## 1. 数据流

```text
NinePalaceEvaluation
  → SpiritualRootGenerator
  → DestinyGenerator
  → OriginFateGenerator
  → LifeMonthlyEventEngine
  → MajorLifeChoiceEngine
  → Age18Awakening
```

九宫命盘是这些系统的共同底层解释。

---

## 2. 给灵根系统的输入

九宫输出：

```text
wuxingInclination
rootBiasTags
```

灵根系统读取：

```text
root:metal_bias
root:wood_bias
root:thunder_bias
root:yin_bias
root:mixed_unstable
root:blocked_bias
```

---

## 3. 给天命系统的输入

九宫输出：

```text
destinyBiasTags
derivedScores
antiWeirdnessWarnings
```

天命系统读取：

```text
destinyBias:heaven_jealous_talent
destinyBias:cowardly_supreme
destinyBias:waste_root_reversal
destinyBias:alchemy_prodigy
destinyBias:demon_seed
```

---

## 4. 给隐藏命系统的输入

九宫输出：

```text
hiddenFateBiasTags
```

例如：

```text
灵感高 + 雷倾向 → 古雷真血权重提高。
神高 + 阴倾向 → 太阴残脉权重提高。
悟性高 + 火/木倾向 → 丹圣遗骨权重提高。
根骨高 + 土/金倾向 → 龙骨未醒权重提高。
```

---

## 5. 给月度事件系统的输入

九宫输出：

```text
lifeEventBiasTags
```

示例：

| 标签 | 事件倾向 |
|---|---|
| event:reading | 私塾、旧书、残卷 |
| event:illness | 病弱、咳血、命火低 |
| event:dream | 梦境、前世、系统杂音 |
| event:martial_training | 练武、砍柴、护村 |
| event:alchemy | 草药、药炉、丹火 |
| event:heart_demon | 梦魇、禁忌、荒祠 |
| event:heaven_attention | 雷雨、天道注视、命盘裂光 |

---

## 6. 给半年选择系统的输入

半年选择可以用九宫决定：

```text
选项成功率
隐藏选项是否出现
选择的风险提示
失败代价
```

例子：

```text
高心性 → 禁忌选择成功率略高，但未必推荐。
高气运 → 冒险选择更可能大成功。
低寿元 → 借寿选择出现概率提高。
高悟性 → 读书/论道类隐藏选项出现。
高根骨 → 练武/炼体类成功率提高。
```

---

## 7. 给 18 岁系统觉醒的输入

九宫最终影响：

```text
初始生命/真元/神识
第一战奖励池
隐藏命揭示概率
域外战场高危事件
系统家园初始偏向
```

---

## 8. 重要约束

```text
九宫命盘不应直接决定所有结果。
它提供倾向和因果解释。
最终事件仍由 Seeded RNG、天命、身世、选择共同决定。
```

这样玩家既能感受到命盘影响，又不会完全确定性。
