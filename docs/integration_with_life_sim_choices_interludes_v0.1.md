# 《与月度事件、半年选择、玩法插曲和阶段转化的集成 v0.1》

## 1. 与月度事件系统

月度事件系统读取：

```ts
LifeStorylineState.activeStorylines
LifeStorylineState.eventThreads
LifeStorylineState.recentHooks
```

并将它们转成：

```text
monthlyEventWeightTags
monthlyEventRequiredHooks
monthlyEventSuppressionTags
```

示例：

```text
药铺丹道线 active
→ herb, medicine, furnace, fire_control 事件权重提高

丹炉梦 thread developing
→ dream_furnace、alchemy_omen、fire_control 事件权重提高
```

## 2. 与半年重大选择系统

半年选择读取：

```text
最近 6 个月月度事件
主线 tension
thread crisis candidate
thread resolution candidate
```

然后生成不同类型选项：

```text
推进主线
回避主线
转向另一条主线
触发玩法插曲
触发阶段转化
```

## 3. 与玩法插曲系统

当 thread 进入 crisis 或 trial 阶段，可能输出：

```ts
playInterludeCandidateHook
```

例如：

```text
hook: play_stg_back_mountain_shadow
mode: STG
duration: 60–90s
worldWrap: 灵识卷入雨夜后山妖影
```

## 4. 与阶段转化系统

当 thread resolved 或 fated，输出：

```text
transitionCandidateHook
```

示例：

```text
破落修士遗脉线 resolved
→ 旧物认主 / 半修行者

系统前兆线 fated
→ 系统半觉醒候选

道观香火线 resolved
→ 白鹿观问心通过 / 入道苗子
```

## 5. 与 18 岁觉醒系统

主线状态和事件线结果写入：

```text
age18Hooks
outerBattlefieldBiasTags
dongfuUnlockHooks
longTermOriginTags
```

示例：

```text
药铺丹道线 resolved
→ 初始洞府：残破丹炉更容易开启
→ 域外第一战：回春丹/清心丹概率增加

山村灾劫线 resolved with merit
→ 第一战：功德护命
→ 洞府：家园守护类任务解锁

系统前兆线 dominant
→ 18 岁系统觉醒文案增强
→ 第一战：系统校准特殊事件
```
