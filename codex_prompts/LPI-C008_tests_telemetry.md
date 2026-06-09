# LPI-C008：测试与遥测

目标：补充玩法插曲系统测试和统计。

测试：
1. 数据校验测试。
2. 0–3 岁不触发真实玩法。
3. 4–8 岁限制 safe/steady。
4. 同 seed 可复现。
5. 频率预算生效。
6. 主线/天命/身世影响模式倾向。
7. 自动推演收益上限低于手动。
8. 插曲结果回写 LifeSimulationState。
9. 隐藏真名不泄露。
10. 失败不终止人生模拟。

遥测：
- lifetimeInterludeCount
- interludeModeDistribution
- manualVsAutoResolveRate
- failureRate
- hiddenSuccessRate
- age18HookGeneratedCount
- interludeFatigueAverage

运行：
npm run typecheck
npm test
npm run build
npm run validate:data
