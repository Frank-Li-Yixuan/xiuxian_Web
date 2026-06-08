> Deprecated / legacy reference only (SIM-REDESIGN).
> Do not execute this prompt directly. Reason: legacy LM dev UI is not LST/LPI/LSTG/ME2/MC2-aware and should not become the current playable UI surface.
> Replacement route: MIG-C008 plus SIM-C008.

# LM-C007：开发调试页 /dev/life-sim

范围：
- 只做开发工具页，不影响正式玩家流程。
- 不修改 src/sim/**。

任务：
1. 新增 /dev/life-sim。
2. 支持选择或输入 seed。
3. 支持选择预设角色：
   - 雷火天妒
   - 药铺丹修
   - 废灵逆命
   - 太阴魂修
   - 苟道闭关
4. 一键跑 216 个月。
5. 显示：
   - 事件列表
   - 分类分布
   - 精气神曲线
   - 生活技能结果
   - 隐藏进度曲线，但不泄露正式 UI 不该显示的真名，可在 dev 展示 internal
   - hooks
6. 支持导出 JSON。
7. 只在 DEV 模式可访问。

验收：
- DEV 可打开 /dev/life-sim
- PROD 不暴露或不可访问
- npm run typecheck
- npm test
