执行 NPF-C004：九宫命盘接入 OAG / DT。

目标：
让 OpeningGenerator 输出 NinePalaceEvaluation，并让 DestinyGenerator 使用天命成立条件与变异机制。

任务：
1. OpeningGenerator 在生成属性后调用 evaluateNinePalace。
2. OpeningInnateDraft 增加 ninePalaceEvaluation 或 compatible 字段。
3. DestinyGenerator 读取 ninePalaceEvaluation。
4. 主天命/副天命生成时：
   - 优先 eligible 且 supportScore 高的天命
   - 反怪组合调用 mutation
   - 变异结果写入 debug
5. CharacterCreationViewModel 显示：
   - 此命与命盘相合 / 相冲 / 异变
6. 不恢复旧 PNG UI。
7. 不修改 src/sim/**。

测试：
- 同 seed 结果可复现
- 天命生成受九宫影响
- 变异结果可显示
- hidden trueName 不泄露

运行：
npm run typecheck
npm test
npm run build
