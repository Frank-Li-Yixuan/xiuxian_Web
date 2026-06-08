> Deprecated / legacy reference only (SIM-REDESIGN).
> Do not execute this prompt directly. Reason: legacy MLC directly integrates old half-year choices into LifeSimulationScreen instead of the current LFP/LifeSimulationV02 route.
> Replacement route: MIG-C005/MIG-C008 plus SIM-C007/SIM-C008.

# MLC-C005：人生模拟 UI 集成

目标：LifeSimulationScreen 每 6 个月暂停并显示重大选择。

任务：
1. 当 LifeSimulationState.pendingMajorChoice 存在时，暂停自动月度推进。
2. 渲染重大选择界面：
   - 年龄
   - 标题
   - 描述
   - 选项卡
   - 风险徽章
   - 成功倾向
   - 可见收益/代价
   - 命格/隐藏/随身物专属标识
3. 支持鼠标点击选择。
4. 选择后显示结果反馈。
5. 点击继续后恢复月度推进。

规则：
- 不显示隐藏血脉真名。
- 页面刷新后 pending choice 不变化。
- 不要修改战斗模拟。

测试：
- 每 6 个月出现选择。
- 选择后人生继续推进。
- 刷新恢复不重 Roll。
