# MC2-C005：玩法插曲与阶段转化集成

目标：让重大选择可以携带玩法插曲候选和阶段转化 token。

任务：
1. option 支持 interludeCandidateId。
2. 生成插曲简报所需上下文，但不实现具体玩法。
3. option 支持 transitionSignals。
4. 选择 outcome 后输出 transitionTokens 和 age18Hooks。
5. 接入 LPI/LSTG 已有接口，如存在。
6. 不改战斗模拟。

运行：
npm run typecheck
npm test
npm run build
