执行 DEM-C002：天命成立条件评估器。

目标：
实现 evaluateDestinyEligibility(input, destinyDefinition)。

输入：
- NinePalaceInputSnapshot
- NinePalaceDerivedScores
- tags
- DestinyDefinitionV2

输出：
- eligible
- supportLevel
- antiMatched
- supportMatched
- mutationCandidate
- reasonTags

规则：
1. any/all 条件通过才可成立。
2. anti 条件命中时 eligible=false，并给 mutationCandidate。
3. supportAny 不满足时可以 eligible=true 但 supportLevel=weak，并使用 weakSupportResult。
4. sourceMutationOf 只用于变异命格，不进入普通候选池。
5. 不使用 Math.random。
6. 不改 UI，不改 src/sim/**。

必须测试：
- 低悟性低灵感不能天妒英才。
- 高悟性低寿元支持天妒英才。
- 废灵逆命成立。
- 高资质不应原形废灵逆命。

运行：
npm run typecheck
npm test
