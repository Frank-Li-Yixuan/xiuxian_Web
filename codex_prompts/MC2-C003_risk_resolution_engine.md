# MC2-C003：风险评估与成功判定引擎

目标：实现半年选择的模糊风险提示和 outcome 判定。

任务：
1. 实现 estimateChoiceRiskHint。
2. 实现 resolveMajorChoiceOutcomeV02。
3. 支持 criticalFailure/failure/partialSuccess/success/greatSuccess/perfectSuccess/hiddenSuccess。
4. 支持天机难测选项。
5. 失败可被废灵逆命/百折不摧等天命转化为资源。
6. 使用 Seeded RNG，不使用 Math.random。

运行：
npm run typecheck
npm test
npm run build
