执行 HFO2-C008：测试、遥测与防泄露。

目标：
补齐 HFO v0.2 的分布、确定性、叙事、防泄露测试与调试输出。

任务：
1. 10000 次生成分布测试：
   - hidden fate rarity
   - origin→hidden fate synergy
   - origin→item synergy
2. 防泄露测试：
   - UI safe view 不包含 trueName
   - 月度日志不包含 trueName
   - 半年选择不包含 trueName
3. 确定性测试：
   - 同 seed 结果一致
4. 叙事测试：
   - 四个 preset 人物产生合理的 origin/item/hidden fate 组合
5. 添加 /dev/origin-fate-debug 页面或报告：
   - 显示内部 trueName，仅 dev 可见
   - 显示 public view 对比
6. 运行：
   npm run typecheck
   npm test
   npm run build

最终回复：
- 测试结果
- 分布摘要
- 防泄露结果
- 仍需调参的问题
