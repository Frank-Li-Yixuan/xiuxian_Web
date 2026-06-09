# LFP-C002：LifeSimulationScreen UI Shell and Route

目标：实现 LifeSimulationScreen 的 DOM 页面骨架，让创建角色确认后有可进入的人生模拟页面。

前提：LFP-C001 完成。

硬约束：
- 不做完整月度推进。
- 不接玩法插曲实现。
- 不改 `src/sim/**`。
- 使用本地 `src/app/ui-system/`，不要 generated PNG 控件。

任务：
1. 新增/重做 LifeSimulationScreen。
2. 布局：Header、左侧命盘摘要、中间事件流/选择区、右侧主线与随身物、底部时间轴。
3. 支持空/占位 state 渲染。
4. 从 profile.stage = life_simulation 路由进入。
5. 如果尚未有真实 state，用 deterministic placeholder state。
6. 支持 1920×1080 和 1366×768。

验收：
- 从角色创建确认后能进入 LifeSimulationScreen。
- 页面显示年龄、阶段、事件流区域、主线区域、底部时间轴。
- 不遮挡、不整页混乱滚动。
- npm run typecheck / npm test / npm run build 通过。
