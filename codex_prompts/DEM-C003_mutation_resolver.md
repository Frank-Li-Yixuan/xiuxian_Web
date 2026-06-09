执行 DEM-C003：变异命格解析器。

目标：
实现 resolveDestinyMutation(candidate, eligibilityResult, context)。

规则：
1. antiResult 优先。
2. weakSupportResult 次之。
3. 变异深度最多 1。
4. 如果变异目标不存在，回退为 reroll。
5. 变异命格在 UI 中作为正常命格显示，但 debug 可见来源。
6. 不改 src/sim/**。

验收：
- 天妒英才反相 → 妄承天机。
- 天妒英才支撑弱 → 慧极易折。
- 废灵逆命反相 → 天骄遭厄。
- 苟道至尊与杀伐倾向冲突 → 隐杀之命。

运行：
npm run typecheck
npm test
