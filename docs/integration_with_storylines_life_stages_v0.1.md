# 与人生主线、月度事件、阶段转化的集成 v0.1

## 1. 与 Life Storyline 集成

玩法插曲是事件线进入以下状态时的表现方式：

```text
development → trial
crisis → playable validation
resolution → optional decisive play
```

例如：

```text
山村灾劫线 / 山贼烟尘 thread / crisis
→ 可生成 STG 或割草插曲
```

## 2. 与月度事件集成

月度事件不直接触发插曲，而是埋 hook：

```text
bandit_threat
thunderstorm_omen
wild_ginseng_field
old_sword_hum
forbidden_page
system_static
```

半年选择读取最近 6 个月 hook，再决定是否生成插曲选项。

## 3. 与半年选择集成

半年重大选择选项中可以包含：

```ts
interludeCandidate?: {
  definitionId: string;
  mode: LifeInterludeMode;
  riskPreview: string;
  autoResolveAllowed: boolean;
}
```

UI 显示：

```text
[险] 夜探后山
可能触发：灵识试炼
预计：约 90 秒
风险：受伤 / 心结
```

## 4. 与阶段转化集成

玩法插曲可以产生：

```text
stageTransitionCandidate
入道资格
系统半觉醒
离家之念
拜师机会
```

但它不直接切阶段，除非下一份“阶段转化系统”确认。

## 5. 与 18 岁觉醒集成

插曲会生成 `age18Hooks`，例如：

```text
outer_battlefield_omen
sword_memory_awakened
alchemy_fire_control
karmic_debt
system_preview_seen
formation_insight
```

18 岁系统觉醒读取这些 hook 决定第一战开局、隐藏揭示和随身物转化。

## 6. UI 流程

```text
半年重大选择出现
  ↓
某选项标记“可进入试炼”
  ↓
玩家点击
  ↓
弹出插曲确认：
    - 手动挑战
    - 自动推演
    - 放弃此选项/返回
  ↓
进入玩法插曲
  ↓
返回人生模拟
  ↓
显示结果日志和属性变化
```

## 7. 存档恢复

若玩家在插曲前退出：

```text
保存 pendingInterludeRunConfig
```

若玩家在插曲中退出：

```text
v0.1 可要求重新开始该插曲
或自动判定 abandon
```

建议 v0.1：

```text
插曲中刷新 → 回到插曲开始前确认页。
不重复 Roll。
RunConfig 保持不变。
```
