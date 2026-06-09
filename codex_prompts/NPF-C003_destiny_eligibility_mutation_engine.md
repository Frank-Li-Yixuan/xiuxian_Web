执行 NPF-C003：天命成立条件与变异引擎。

目标：
让天命不再是独立随机 buff，而是由九宫命盘支撑。

实现：
1. evaluateDestinyEligibility(traitId, ninePalaceEvaluation, context)
2. 输出：
   - eligible
   - supportScore
   - contradictionScore
   - mutationTarget
   - explanation
3. 实现 applyAntiWeirdnessRules(selection, ninePalaceEvaluation)
4. 支持变异命格：
   - 天妒英才 → 妄承天机
   - 废灵逆命 → 天骄遭厄
   - 苟道至尊 → 隐杀之命
   - 劫雷亲和 → 雷厄印
   - 丹道奇才 → 躁火炼药
   - 器灵之眷 → 法宝排异
   - 魔心暗种 + 清净琉璃心 → 净莲藏影
5. 不修改 UI。
6. 不修改 src/sim/**。

测试：
- 低 talentScore 不接受天妒英才
- 高 talentScore + 低寿元接受天妒英才
- 高资质不接受废灵逆命，变异为天骄遭厄
- 苟道至尊与以战养战冲突时变异或拒绝
- 魔心与清净冲突时可变异净莲藏影

运行：
npm run typecheck
npm test
npm run build
