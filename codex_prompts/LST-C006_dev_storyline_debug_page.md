# LST-C006：/dev/life-storylines 调试页

目标：提供开发页观察主线评分和事件线状态。

任务：
1. 新增 `/dev/life-storylines`。
2. 支持选择样例角色：
   - 药铺丹修
   - 废灵剑修
   - 阴梦魂修
   - 天妒雷修
   - 山村灾劫
3. 显示：
   - activeStorylines
   - score breakdown
   - eventThreads
   - thread progress/tension/clarity/risk
   - candidate play interlude hooks
   - candidate transition hooks
4. 这是 dev 页，正式 UI 不显示这些精确数值。
5. 不要修改 src/sim/**。

运行：
- npm run typecheck
- npm test
- npm run build
