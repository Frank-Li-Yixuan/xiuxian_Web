# MIG-C005：Life Choice + Interlude + Stage Integration

目标：将半年重大选择 v0.2、玩法插曲、阶段转化接入 LifeSimulationV02。

任务：

1. PendingMajorChoice 使用 MC2 规则生成。
2. 选择生成读取：
   - 最近 6 个月事件 hooks
   - active storylines
   - eventThreads crisis/developing
   - LifeStageState
   - hidden branch signals
   - interlude frequency budget
3. 选项支持：稳/正/险/凶/禁/命。
4. 满足条件时显示隐藏分支，但不泄露 hidden trueName。
5. 选项可携带 interludeCandidate。
6. 玩家可选择：手动挑战 / 自动推演 / 返回选择。
7. 插曲结果回写：
   - 属性
   - 伤病
   - 心结
   - 功德/业力
   - 隐藏进度
   - 随身物生命周期
   - 事件线
   - stage transition tokens
8. 阶段系统可根据 token 触发 PendingStageTransition。

禁止：

- 不实现完整 STG/DBG/割草/棋局新玩法。
- 首版插曲可用自动推演；已有 STG 插曲可选接入。
- 不改 src/sim/**，除非已有插曲模式封装要求且先确认。

测试：

- 0–3 岁无玩法插曲。
- 隐藏分支条件不满足不显示。
- 插曲频率预算生效。
- 自动推演最高不超过 success。
- 失败不会终止人生。
