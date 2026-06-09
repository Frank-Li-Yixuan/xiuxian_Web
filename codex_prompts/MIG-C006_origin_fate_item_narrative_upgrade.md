# MIG-C006：Origin/Fate/Item Narrative Upgrade

目标：将 HFO v0.1 升级为 HFO2 v0.2 的叙事链系统。

任务：

1. 新增 OriginFateNarrativeState。
2. 隐藏命支持阶段：seeded / omen / misleading / stirring / halfReveal / nearAwake / revealed / unstable / sealed。
3. 身世支持 origin storyline 四段：earlyEcho / childhoodSeed / youthConflict / teenChoice。
4. 随身物支持 lifecycle：obtained / noticed / resonating / tested / damaged / deepened / converted / inherited。
5. 事件/选择/插曲可推进 hidden fate stage 与 item lifecycle。
6. 添加 misdirection：允许安全别名和误导预兆，不泄露真名。
7. 18 岁或成年节点才允许 trueName reveal。

测试：

- 创建页不泄露 trueName。
- 月度日志不泄露 trueName。
- 半年选择不泄露 trueName。
- 随身物 lifecycle 可推进。
- 共鸣规则影响权重。
