# LST-C007：测试、分布与遥测

目标：为人生主线系统补分布和回归测试。

任务：
1. 增加 10000 次生成分布测试。
2. 统计：
   - 各主线 active/dominant/fated 概率
   - 每个角色 active 主线数量
   - 系统前兆线过度激活率
3. 测试：
   - 同 seed 一致
   - 不同典型命盘生成不同主线
   - 无支撑主线不应 fated
   - 主线结果可序列化进 LifeSimulationState
4. 输出 debug report 到 artifacts 或 test output。

运行：
- npm run typecheck
- npm test
- npm run build
