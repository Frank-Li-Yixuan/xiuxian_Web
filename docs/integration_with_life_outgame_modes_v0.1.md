# 与人生模拟、局外洞府、多模式试炼的集成 v0.1

## 1. 与月度事件系统

月度事件系统输出：

```text
monthlyLogs
hiddenFateProgress
carriedItemAffinity
wounds
heartKnots
karma
merit
system omen hooks
```

18 岁结算读取这些结果，但不重新生成月度事件。

关键要求：

```text
已发生的人生事件不可被 18 岁系统重 Roll。
结算只是解析，不改变过去。
```

---

## 2. 与半年选择系统

半年选择提供：

```text
majorChoiceHistory
age18Hooks
关键成功 / 失败记录
禁忌选择记录
功德 / 业力变化
```

18 岁结算中，半年选择比普通月度事件权重更高。

示例：

```text
十七岁·生辰前雷云 选择“前往山巅迎雷”且成功
→ thunder_fate_accumulated + hiddenFateProgress
→ 18 岁古雷真血揭示概率提高
```

---

## 3. 与隐藏血脉系统

隐藏血脉系统提供：

```text
hiddenFateInternal
visibleHiddenOmen
hiddenFateProgress
age18ConversionHooks
```

18 岁时根据 reveal_rules 解析。

重要规则：

```text
未揭示的隐藏命仍写入内部 Profile，但 UI 只显示“未明因果”。
揭示后的隐藏命写入长期标签。
半觉醒隐藏命只在第一战临时触发，战后根据表现决定是否保留线索。
```

---

## 4. 与随身物系统

随身物有两个作用：

```text
第一战短期转化
洞府长期线索
```

例如：

```text
祖传玉佩
  第一战：一次护盾
  洞府：灵宝修复线索
```

Codex 实现时不要把随身物转化只写成第一战 buff。它还必须给系统家园初始任务或模块加 hook。

---

## 5. 与天命系统

天命系统提供：

```text
destinySelection
synergyRules
conflictRules
destinyTags
modeProjectionTags
```

18 岁结算将天命投射为：

```text
第一战规则
人生结算文案
洞府初始标签
后续试炼模式修正
```

示例：

```text
苟道至尊
  第一战：存活奖励 +，战斗主动性弱
  洞府：闭关/挂机相关引导任务
  后续模式：虫族入侵偏防守，天地棋局偏阵法稳健
```

---

## 6. 与域外战场 STG 模式

第一战使用 `outer_battlefield_intro`，不是完整常规 `outer_battlefield_regular`。

区别：

| 项 | intro | regular |
|---|---|---|
| 时长 | 3–5 分钟 | 8–15 分钟 |
| 难度 | 教学+验证 | 常规挑战 |
| 失败 | 不删档，可重试 | 正常结算 |
| 奖励 | 家园权限、基础材料 | 正常刷取奖励 |
| Build | 初始命格展示 | 完整肉鸽构筑 |

---

## 7. 与系统洞府 / 家园

第一战成功后开启系统家园。

家园模块解锁要受人生模拟影响。

示例：

| 条件 | 家园影响 |
|---|---|
| 药铺学徒 / 药铺铜炉 / 丹道奇才 | 残破丹炉更早可用 |
| 破落修士之后 / 残破木剑 | 炼器石台有飞剑修复线 |
| 道观杂役 / 破旧符纸 | 藏经残壁与符箓线索 |
| 守墓人之子 / 黑骨短笛 | 魂修或清心池线索 |
| 功德高 | 家园初始稳定度 + |
| 业力高 | 家园初期可能出现因果追索事件 |

---

## 8. 与未来多模式试炼

18 岁结算会写入长期标签，供未来模式读取。

```text
outerBattlefieldBiasTags
hordeModeBiasTags
deckbuilderBiasTags
autoChessBiasTags
```

示例：

| 标签 | 域外战场 | 虫族入侵 | 万族试炼塔 | 天地棋局 |
|---|---|---|---|---|
| root:metal | 飞剑/穿透 | 穿透武器 | 剑诀牌 | 剑修棋子 |
| hidden:ancient_thunder | 雷法/天劫 | 链雷进化 | 雷法牌 | 乾位雷阵 |
| destiny:goudao | 存活奖励 | 防守加成 | 防御牌 | 稳定阵法 |
| karma:high | 高危敌人 | 虫潮异化 | 心魔牌 | 魔阵 |

---

## 9. 存档集成

建议 Profile 存储：

```ts
interface ProfileAge18State {
  awakeningResolution?: Age18AwakeningResolution;
  outerBattlefieldIntro?: {
    status: "pending" | "in_progress" | "cleared" | "failed_retryable";
    runConfig?: OuterBattlefieldIntroRunConfig;
    attempts: number;
    lastFailureReason?: string;
  };
  systemHome?: {
    status: "locked" | "unlock_pending" | "unlocked";
    unlockPlan?: SystemHomeUnlockPlan;
  };
}
```

保存点：

```text
18 岁结算完成后保存
进入第一战前保存
第一战失败后保存
第一战成功后保存
家园开启后保存
```

---

## 10. 防重复结算

绝对不能每次刷新页面都重新 Roll 18 岁结果。

实现规则：

```text
如果 Profile 已有 awakeningResolution，则直接读取。
只有没有 awakeningResolution 且 ageMonths >= 216 时才运行 resolveAge18Awakening。
```

同样：

```text
如果 outerBattlefieldIntro.runConfig 已生成，不得重新生成 seed。
```
