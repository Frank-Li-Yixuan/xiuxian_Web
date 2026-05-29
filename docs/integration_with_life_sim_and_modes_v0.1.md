# 《隐藏身世系统与人生模拟 / 多模式试炼集成 v0.1》

版本：v0.1

---

## 1. 集成总览

```text
角色创建
  ↓
属性与灵根生成器
  ↓
天命生成器
  ↓
隐藏血脉、身世、随身物生成器
  ↓
0–18 岁人生模拟
  ↓
18 岁系统觉醒
  ↓
域外战场第一战
  ↓
洞府开启
```

本系统处在创建阶段末尾，人生模拟开始之前。

---

## 2. 写入 CharacterCreationDraft

确认创建前，Draft 应包含：

```ts
interface CharacterCreationDraft {
  opening: OpeningInnateDraft;
  destiny: DestinySelectionState;
  originFate: OriginFateDraft;
}
```

`originFate` 中必须包含：

```text
backgroundOrigin
hiddenFateInternal
visibleHiddenOmen
carriedItems
lifeEventBiasTags
modeProjectionTags
age18ConversionHooks
```

---

## 3. 人生模拟读取方式

人生模拟事件生成器读取：

```text
originFate.backgroundOrigin.lifeEventBiasTags
originFate.hiddenFate.lifeEventBiasTags
originFate.carriedItems[].lifeEventTags
originFate.hiddenFateProgressBand
```

事件权重示例：

```text
如果 hiddenFate = 古雷真血：
雷雨夜、后山异象、天道注视、域外战场梦境权重提高。

如果 carriedItem = 药铺铜炉：
分药、火候、偷试丹炉、丹炉梦权重提高。

如果 background = 流民遗孤：
逃荒、兵灾、业力选择、救人与自保权重提高。
```

---

## 4. 半年重大选择中的隐藏选项

某些半年选择可出现隐藏选项，但不直接揭示真名。

示例：

```text
【雨夜异象】
普通选项：留在家中 / 前往后山 / 祈告祖先
隐藏选项：顺着雷声中熟悉的呼唤前进
出现条件：hiddenFate has thunder tag 且 progress >= 30
```

选择隐藏选项后：

```text
隐藏进度 +15
可能受伤
雷系事件后续权重提高
```

---

## 5. 18 岁觉醒集成

18 岁结算时调用：

```ts
resolveAge18OriginFate(originFate, lifeSimulationLog, rng)
```

输出：

```ts
Age18OriginFateResolution {
  revealedHiddenFate?: RevealedHiddenFate;
  convertedItems: ConvertedCarriedItem[];
  outerBattlefieldModifiers: ModeModifier[];
  dongfuHooks: DongfuOpeningHook[];
  longTermTags: string[];
}
```

---

## 6. 域外战场第一战投射

投射示例：

| 隐藏命/随身物 | 域外战场效果 |
|---|---|
| 古雷真血 progress >= 70 | 濒死触发雷血护体 |
| 太阴残脉 progress >= 70 | 神魂状态更强，救援更稳 |
| 丹圣遗骨 progress >= 70 | 首枚丹药效果提高 |
| 前世剑魄 progress >= 70 | 飞剑类法宝增强 |
| 魔印微痕 progress >= 65 | 低血增伤，但心魔扰动 |
| 祖传玉佩 | 开局一次护盾 |
| 破旧符纸 | 开局低阶护命符 |
| 裂纹铜钱 | 初始重 Roll 或掉落修正 |

---

## 7. 洞府开局投射

洞府开启时，隐藏命和随身物可以影响初始模块：

```text
药铺铜炉 / 丹圣遗骨
→ 炼丹房初始火候经验或配方线索

残破木剑 / 前世剑魄
→ 炼器阁飞剑修复线索

旧香炉 / 功德种子
→ 香火/功德事件线索

黑骨短笛 / 太阴残脉 / 魔印
→ 魂修或净化路线选择
```

---

## 8. 多模式试炼投射

| 路线 | 域外战场 | 虫族入侵 | 万族试炼塔 | 天地棋局 |
|---|---|---|---|---|
| 雷血 | 雷法、雷劫 | 链雷清怪 | 雷法牌 | 乾位雷阵 |
| 丹圣 | 丹药、火候 | 毒材/药材 | 丹药牌 | 炼丹辅助棋子 |
| 剑魄 | 飞剑、暴击 | 穿透武器 | 剑诀牌 | 剑修棋子 |
| 太阴 | 神魂、魂修 | 幽魂召唤 | 心魔/魂牌 | 魂阵 |
| 功德 | 护命、救援 | 守护洞府 | 净化牌 | 护法棋子 |
| 魔印 | 高风险爆发 | 虫潮密度/掉落 | 魔念牌 | 心魔棋子 |
| 系统共鸣 | 提示/奖励 | 模式解锁 | 特殊规则 | 天机推演 |

---

## 9. 存档字段

推荐 Profile 中保存：

```ts
originFateMemory: {
  backgroundOriginId: string;
  hiddenFateId: string;
  hiddenFateProgress: number;
  hiddenFateRevealState: "sealed" | "hinted" | "halfAwakened" | "revealed";
  carriedItemIds: string[];
  revealedTags: string[];
  age18Resolution?: Age18OriginFateResolution;
}
```

这样即使隐藏真名不显示，系统仍能长期追踪。
