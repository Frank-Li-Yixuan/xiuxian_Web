执行 DEM-C004：互斥共鸣引擎 v2。

目标：
实现 applyDestinyConflictSynergy(selectedDestinies, rules)。

规则：
1. 硬互斥：若存在 mutation，则替换为变异命格；否则删除低优先级候选并 reroll。
2. 软冲突：保留，输出警告。
3. 共鸣：保留，输出 synergy tag 和 UI 提示。
4. 引擎必须确定性。
5. 不修改 src/sim/**。

验收：
- 魔心暗种 + 清净琉璃心 → 净莲藏影。
- 天妒英才 + 大器晚成不能共存。
- 苟道至尊 + 以战养战不能共存。
- 丹道奇才 + 器灵之眷输出软冲突。
- 天妒英才 + 劫雷亲和输出慧光引雷共鸣。

运行：
npm run typecheck
npm test
