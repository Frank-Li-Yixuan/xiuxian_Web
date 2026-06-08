> Deprecated / legacy reference only (SIM-REDESIGN).
> Do not execute this prompt directly. Reason: legacy LM distribution tests cover the old monthly-event model and must be replaced by ME2/storyline/density acceptance.
> Replacement route: MIG-C004/SIM-C006, then SIM-C011.

# LM-C008：测试与分布验收

范围：
- 补充自动测试和分布测试。

任务：
1. 增加确定性测试：
   - 同 seed 同输入结果一致。
2. 增加完整推进测试：
   - 0→216 月不崩。
3. 增加分布测试：
   - 1000 个角色
   - 事件分类分布合理
   - 精气神范围合理
4. 增加倾向性测试：
   - 雷火短命天才雷雨/天道事件更多
   - 药铺丹修药理事件更多
   - 废柴逆命失败/逆命事件更多
   - 太阴魂修梦境/神魂事件更多
   - 苟道闭关静修/避祸事件更多
5. 增加泄露测试：
   - monthlyLogs 不显示 hidden true name。
6. 增加 pending choice 测试：
   - 6,12,...,210 有 pending。
   - 216 不触发普通 pending，而是 age18 handoff。

验收：
- npm run typecheck
- npm test
- 分布测试稳定，不要 flaky
- 测试输出关键统计
