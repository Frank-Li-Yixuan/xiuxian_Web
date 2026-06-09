执行 NPF-C006：九宫命盘测试、分布与调试展示。

目标：
补充分布测试和调试输出，确保系统不再生成大量反怪组合。

任务：
1. 增加 10000 次生成分布测试。
2. 输出统计：
   - 天妒英才样本 talentScore 分布
   - 废灵逆命样本 rootBone/heart 分布
   - 苟道至尊样本 heart/lifespan 分布
   - 变异命格出现率
3. 增加 /dev/fate-matrix 或扩展角色创建 debug panel：
   - 显示三才评分
   - 显示派生评分
   - 显示天命成立解释
   - 显示变异原因
4. 不在正式 UI 默认显示 debug。
5. 不修改 src/sim/**。

验收：
- 分布测试通过
- 反怪组合为 0 或被变异
- debug panel 可查看但不影响正式玩家

运行：
npm run typecheck
npm test
npm run build
