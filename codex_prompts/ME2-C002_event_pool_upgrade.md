# ME2-C002：月度事件池升级

目标：将当前人生模拟使用的 v0.1 事件池升级为 v0.2 结构。

任务：
1. 保留旧 LifeSimulationState 兼容。
2. 新增 MonthlyLifeEventV02 选择接口。
3. 如果旧事件仍存在，写兼容 adapter。
4. 确保 v0.2 事件可以输出：
   - visibleEffects
   - hiddenEffects
   - hooks
   - interludeCandidate
   - stageTransitionSignal
5. 不实现复杂权重，先能读取并按年龄筛选。

验收：
- 0–216 月能找到候选事件
- 各阶段至少有候选
- 不泄露隐藏真名
- npm run typecheck
- npm test
