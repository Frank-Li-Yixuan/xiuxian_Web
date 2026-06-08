> Deprecated / legacy reference only (SIM-REDESIGN).
> Do not execute this prompt directly. Reason: it wires LifeSimulation completion directly into age-18 awakening and outer-battlefield UI, bypassing AdultNode path scoring.
> Replacement route: MIG-C009 plus SIM-C010.

# A18-C007：UI Flow 集成

目标：把 LifeSimulation 216 月结束后接入 18 岁系统觉醒页面、第一战战前页面、系统家园开启页面。

范围：React/DOM app 层，不改 src/sim/**。

任务：

1. 当 LifeSimulationState.ageMonths >= 216，进入 `Age18AwakeningScreen`。
2. Age18AwakeningScreen 显示：
   - 系统觉醒逐行日志
   - 最终属性摘要
   - 天命投射摘要
   - 隐藏预兆解析结果
   - 随身物解析结果
   - 进入域外战场按钮
3. 点击进入域外战场前，显示 `OuterBattlefieldBriefingScreen`：
   - 初始法宝 / 法术 / 丹药 / 符箓
   - 第一战规则
   - 失败不删档说明
4. 第一战胜利后显示 `SystemHomeUnlockScreen`：
   - 系统开辟家园文案
   - 初始模块
   - 初始资源
   - 下一目标
5. 保存与恢复：
   - 已解析结果不重复 Roll
   - 刷新后恢复当前阶段
6. 不重做设置页。

验收：

- 216 月后不直接进战斗，先显示觉醒界面
- 觉醒界面不泄露未揭示隐藏命真名
- 第一战失败可重试
- 第一战成功进入家园开启
