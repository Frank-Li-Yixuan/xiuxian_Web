# LPI-C005：与 LifeSimulation / MajorChoice 集成

目标：让半年重大选择能携带玩法插曲候选。

硬约束：
- 不重做整个 LifeSimulation UI。
- 不修改 src/sim/**。
- 只在已有 MajorChoice 流程上扩展 interludeCandidate。

任务：
1. 在生成 MajorChoiceOption 时调用 LifeInterludeTriggerEngine。
2. 让部分选项包含 `interludeCandidate`。
3. UI 显示：
   - 可能进入试炼
   - 模式
   - 预计时长/回合
   - 风险
   - 可自动推演
4. 点击此类选项时，不立即结算，而进入插曲确认流程。
5. 插曲结束后，调用 ResultWritebackEngine，然后恢复人生模拟。
6. 插曲 config 存档，刷新后不重复 Roll。

验收：
- 半年选择里能出现玩法插曲选项。
- 文本选项仍正常。
- 自动推演可用。
- 手动挑战如果 mode 未实现，则使用 placeholder resolver。
- 刷新恢复不会重刷候选。
- npm run typecheck
- npm test
