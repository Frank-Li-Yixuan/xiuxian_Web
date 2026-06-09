执行 NPF-C002：九宫命盘评分引擎。

目标：
由 NinePalaceAttributes 计算三才评分、派生评分、五行倾向和因果标签。

实现：
1. evaluateNinePalace(attributes): NinePalaceEvaluation
2. 计算：
   - heaven/human/earth
   - talentScore
   - vesselScore
   - stabilityScore
   - destinyPressureScore
   - lateBloomScore
   - rebellionScore
   - wuxingInclination
   - causality tags
3. 反向属性如 lifespan_inverse、heart_inverse 要稳定处理。
4. 所有计算纯函数，可测试。
5. 不使用 Math.random。
6. 不修改 src/sim/**。

测试：
- 高悟性高灵感 → talentScore 高
- 低寿元高悟性 → destinyPressureScore 高
- 高心性高寿元 → lateBloomScore 高
- 低根骨高心性 → rebellionScore 高
- 五行倾向标签正确

运行：
npm run typecheck
npm test
npm run build
