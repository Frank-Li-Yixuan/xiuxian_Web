# ME2-C008：开发调试页与测试遥测

目标：提供 /dev/monthly-events-v2 页面与分布测试。

实现：
1. /dev/monthly-events-v2
2. 预设角色：
   - 药铺丹修
   - 破落剑脉
   - 阴梦魂修
   - 山村雷命
   - 苟道潜修
3. 快速推演 216 个月。
4. 显示：
   - 事件分类分布
   - tier 分布
   - 主线推进图
   - 插曲候选次数
   - 阶段转化 signal
   - hidden leak 检查
5. 增加测试：
   - deterministic
   - density
   - storyline bias
   - no hidden trueName leak

验收：
- dev 页面可用
- 预设角色事件分布明显不同
- 测试通过
- npm run typecheck
- npm test
- npm run build
