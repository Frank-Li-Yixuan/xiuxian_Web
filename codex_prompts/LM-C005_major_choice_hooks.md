> Deprecated / legacy reference only (SIM-REDESIGN).
> Do not execute this prompt directly. Reason: legacy LM hooks into the old major-choice flow instead of MC2/LPI/LSTG-aware integration.
> Replacement route: MIG-C004/MIG-C005 plus SIM-C006/SIM-C007.

# LM-C005：半年重大选择 Hook 集成

范围：
- 只生成 PendingMajorChoiceRef。
- 不实现完整半年选择系统。

任务：
1. 每 6 个月暂停月度推进：
   - 6, 12, 18 ... 210
   - 216 进入系统觉醒，不触发普通半年选择
2. 收集最近 6 个月：
   - eventIds
   - majorChoiceHooks
   - wounds
   - heartKnots
   - high/low stats
   - hiddenFateBands
3. 生成 PendingMajorChoiceRef。
4. 如果 state.pendingMajorChoice 存在，advanceOneMonth 不应继续推进，除非选择系统已 resolve。
5. 提供 resolvePendingMajorChoiceForTest(state, result) 的测试辅助。
6. 添加测试：
   - 6 个月触发 pending
   - 未 resolve 时不继续
   - resolve 后继续
   - hooks 正确收集

验收：
- npm run typecheck
- npm test
