# LPI-C006：玩法插曲 UI 流程与过渡

目标：实现玩法插曲确认、过渡和结果展示。

硬约束：
- 不做完整模式重写。
- 不修改 src/sim/**。
- 使用现有 DOM UI System。

任务：
1. 增加 InterludeConfirmDialog：
   - 手动挑战
   - 自动推演
   - 返回选择
2. 增加 InterludeTransitionScreen：
   - 显示世界观包装文案
   - 显示模式类型
   - 显示风险
3. 增加 InterludeResultPanel：
   - outcome
   - 可见日志
   - 属性变化
   - 伤病/心结
   - 获得 hook 的模糊提示
4. reduced-motion 支持。
5. 插曲结束后返回 LifeSimulationScreen。

验收：
- 插曲确认弹窗可操作。
- 自动推演走完整结果回写。
- 结果界面不泄露隐藏真名。
- Esc/返回行为正常。
- npm run typecheck
- npm test
