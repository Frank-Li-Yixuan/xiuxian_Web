# LFP-C009：E2E Tests and Screenshots

目标：验证 18 年人生模拟首版可玩体验可完整跑通。

任务：
1. 增加 E2E 或集成测试：
   - 创建角色确认后进入人生模拟
   - 自动推进到半年选择
   - 选择结算
   - 插曲自动推演
   - 阶段总结
   - 推进到 216 月
   - 成人节点 pending
2. 增加预设角色测试：
   - 药铺丹道型
   - 破落剑魄型
   - 山村雷劫型
   - 阴梦魂修型
   - 苟道潜修型
3. 生成截图：
   - 初始人生模拟页
   - 月度日志播放
   - 半年选择
   - 插曲入口
   - 阶段总结
   - 成人节点 pending
4. 输出 artifacts/life-sim-first-playable-YYYY-MM-DD/。

运行：
- npm run typecheck
- npm test
- npm run build
- npm run validate:data
- npm run check:forbidden

验收：
- 所有测试通过。
- 截图完整。
- hidden trueName leak = 0。
