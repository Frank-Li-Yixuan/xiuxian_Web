# LST-C003：事件线选择与推进引擎

目标：根据 activeStorylines 初始化和推进 Event Threads。

前提：LST-C001、LST-C002 已完成。

任务：
1. 实现 `EventThreadEngine.initializeThreads(input)`。
2. 对 hinted/active/dominant/fated 主线选择 1–2 条匹配的 threads。
3. 实现 `advanceThreadByHook(thread, hook)`：
   - progressDelta
   - tensionDelta
   - clarityDelta
   - riskDelta
4. 根据 progress/tension/clarity/risk 更新 stage。
5. 输出：
   - recentHooks
   - playInterludeCandidateHooks
   - transitionCandidateHooks
6. 测试：
   - 药铺丹修初始化 furnace_dream / herb 相关 thread
   - tension >= 70 生成玩法插曲候选
   - progress + clarity 高时进入 resolved 候选
   - risk 高时可进入 failed/crisis

硬约束：
- 不修改 src/sim/**
- 不实现玩法插曲
- 不实现 UI

运行：
- npm run typecheck
- npm test
- npm run build
