# DT-C002：天命生成器

目标：实现可复现的天命 Draft 生成器。

任务：
1. 新建 `DestinyRoller.ts`。
2. 输入 seed、锁定字段、previousDraft，输出 CharacterCreationDraft 中的 destinies 部分。
3. 主天命、副天命、劫命使用不同权重表。
4. 实现天机值：连续低质量结果提高下一次主天命品质。
5. 不生成硬互斥组合。
6. 生成 debugInfo，记录被拒绝候选和最终权重。

验收：
- 同 seed 结果一致。
- 1000 次生成无异常。
- 主天命不出凡命。
- 劫命一定来自 flaw slot。
- npm run typecheck / npm test 通过。
