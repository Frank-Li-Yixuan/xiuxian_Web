# MC2-C008：测试与遥测

目标：补足半年重大选择 v0.2 的分布测试、回归测试和调试输出。

测试：
1. 同 seed 可复现。
2. 0–3 岁无真实玩法插曲。
3. hiddenBranch 不满足时不显示。
4. 满足时显示模糊提示但不泄露 trueName。
5. 禁忌选项需要信号。
6. crisis thread 提高相关选择权重。
7. 失败写入伤病/心结。
8. 废灵逆命失败获得逆命点。
9. 分布统计符合预期。

输出 debug report：
artifacts/life-choice-v02-debug-YYYY-MM-DD/

运行：
npm run typecheck
npm test
npm run build
