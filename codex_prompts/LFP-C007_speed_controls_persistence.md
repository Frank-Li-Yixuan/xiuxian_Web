# LFP-C007：Speed Controls and Persistence

目标：实现人生模拟的加速、暂停、保存和恢复。

任务：
1. 播放速度：slow / standard / fast / debug。
2. 按钮：暂停、继续、播放到下一选择、播放到阶段结束。
3. 保存当前 LifeSimulationPlayableState。
4. 刷新页面后恢复当前月、当前日志、当前 pending choice / interlude / summary。
5. 未结算的选择不能刷新后改变选项。
6. 未结算插曲不能刷新后丢失。
7. 同 seed 复现。

验收：
- 正在半年选择时刷新，选择不变化。
- 正在阶段总结时刷新，仍显示总结。
- 正在播放时刷新，状态可恢复。
- npm run typecheck / npm test / npm run build。
