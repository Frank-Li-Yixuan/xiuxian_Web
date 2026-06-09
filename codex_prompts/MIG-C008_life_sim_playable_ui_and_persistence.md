# MIG-C008：Life Sim Playable UI and Persistence

目标：实现首版可玩 LifeSimulationScreen，使用 LFP 规格。

任务：

1. LifeSimulationScreen UI：
   - Header：年龄、阶段、身份、速度、暂停
   - 左侧：九宫、天命显化、隐藏预兆
   - 中央：月度事件流 / 半年选择 / 插曲入口
   - 右侧：人生主线 / 随身物 / 事件线
   - 底部时间轴
2. 月度自动播放。
3. 半年选择暂停。
4. 插曲入口：手动/自动/返回。
5. 阶段总结。
6. 播放速度：慢/标准/快速。
7. 存档恢复到当前月/选择/插曲状态。
8. 216 月进入成年节点 pending。

禁止：

- 不接完整 STG 重构。
- 不强制真实 LLM。
- 不泄露 hidden trueName。

测试：

- 创建角色确认后进入 LifeSimulation。
- 216 月可推进。
- 每 6 个月暂停选择。
- 刷新恢复。
- reduced-motion 可用。
