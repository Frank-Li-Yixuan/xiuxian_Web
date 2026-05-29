# LM-C006：人生模拟存档与恢复

范围：
- 支持人生模拟中途保存/恢复。
- 不做 UI 大改。

任务：
1. 将 LifeSimulationState 写入 Profile：
   - stage = "life_simulation"
   - ageMonths
   - core/aptitude/lifeSkills
   - hiddenFateProgress
   - carriedItemAffinity
   - monthlyLogs
   - pendingMajorChoice
   - rngState
2. Continue Game：
   - 如果 profile.stage === "life_simulation"，恢复到 LifeSimulationScreen。
3. 每个月推进后或每次半年选择后保存。
4. 添加 migration 防护：
   - 旧存档无 lifeSimulationState 时不能崩。
5. 测试：
   - 14 岁保存后恢复 ageMonths 正确
   - pendingMajorChoice 恢复正确
   - rngState 恢复后后续事件序列一致

验收：
- npm run typecheck
- npm test
