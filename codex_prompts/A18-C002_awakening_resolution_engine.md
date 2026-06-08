> Deprecated / legacy reference only (SIM-REDESIGN).
> Do not execute this prompt directly. Reason: legacy A18 awakening assumes a fixed age-18 resolution instead of the AdultNode path-scoring bridge.
> Replacement route: MIG-C009 plus SIM-C010.

# A18-C002：觉醒结算引擎

目标：实现 `resolveAge18Awakening(input)`，从人生模拟结果生成 18 岁觉醒结算。

必须已完成：A18-C001。

任务：

1. 新建 `src/age18/resolveAge18Awakening.ts`。
2. 输入 `Age18AwakeningInput`。
3. 读取：
   - final life stats
   - destiny selection
   - origin fate
   - life simulation wounds / heart knots / merit / karma / hidden progress
   - major choice history hooks
4. 生成：
   - FinalLifeStats
   - AwakeningScoreBreakdown
   - system messages
   - warnings
5. 暂时可 stub hidden fate reveal、carried item conversion、destiny projection，但结构必须存在。
6. 如果 Profile 已有 awakeningResolution，不重复结算。
7. 所有随机必须使用 Seeded RNG，不使用 Math.random。
8. 不改战斗模拟。

验收：

- 同 seed + 同输入结果一致
- ageMonths 必须为 216，否则返回错误或不触发
- systemMessages 至少包含 5 条系统日志
- awakeningScore 有 bandLabel
- npm run typecheck
- npm test
