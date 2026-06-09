# 与主线、插曲、阶段转化系统的集成 v0.2

## 1. 与人生主线系统

每次月度事件选中后，应检查：

```text
storylineIds
threadIds
hooks
visibleEffects
hiddenEffects
```

如果事件绑定 `threadIds`，应推进对应事件线。

示例：

```text
木剑轻鸣
→ broken_lineage +4
→ wooden_sword_thread progress +8
→ 前世剑魄预兆 +6
```

## 2. 与半年重大选择系统

月度事件不会直接弹选择。  
它输出 hooks：

```text
hook_bandit_threat
hook_forbidden_page
hook_wild_ginseng
hook_jade_board
```

半年选择系统读取最近 6 个月 hook 生成候选。

## 3. 与玩法插曲系统

月度事件通过 `interludeCandidate` 埋下可玩插曲。

示例：

```text
rain_mountain_low_whisper
→ interlude_rain_backhill_stg
```

半年选择系统生成：

```text
[险] 偷偷前往后山
```

玩家点击后才进入插曲。

## 4. 与阶段转化系统

月度事件通过 `stageTransitionSignal` 或 `stageToken` 影响身份阶段。

示例：

```text
一息通达
→ transition_initiation_ready
```

阶段转化系统判断是否进入：

```text
求道苗子
半修行者
入道候选
系统候选者
```

## 5. 与隐藏血脉系统

月度事件可以修改隐藏进度，但 UI 只能显示模糊预兆。

内部：

```json
{"hiddenFateTag":"ancient_thunder","delta":5}
```

可见：

```text
雷声似乎离你更近。
```

## 6. 与 18 岁觉醒系统

部分月度事件输出：

```text
age18Hook
outer_battlefield_omen
system_static
countdown_clouds
fate_matrix_crack
```

18 岁觉醒读取这些 hook 决定：

```text
域外战场路径
入道试炼路径
血脉觉醒路径
系统征召路径
```
