# MC2-C006：效果回写与日志

目标：将重大选择 outcome 回写 LifeSimulationState。

任务：
1. 根据 outcomeEffectKey 应用效果。
2. 支持属性、lifeSkills、伤病、心结、功德、业力、隐藏进度、随身物亲和、主线分数、事件线进度、age18Hooks。
3. 生成可见日志。
4. 隐藏效果日志不得泄露真名。
5. 支持 LLM 文案 hook 预留，但不实际调用外部 API。

运行：
npm run typecheck
npm test
npm run build
