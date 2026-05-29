# LM-C003：事件权重、条件与重复惩罚

范围：
- 实现事件候选过滤与权重计算。
- 不做 UI。
- 不改战斗。

任务：
1. 实现 evaluateLifeEventConditions(event.conditions, state, context)。
2. 实现 computeMonthlyEventWeight(event, state, context, phase)。
3. 实现 tagBonus：
   - 灵根标签
   - 天命标签
   - 出身标签
   - 隐藏命标签
   - 随身物标签
   - 当前状态标签
4. 实现 stateBonus：
   - wounds
   - heartKnots
   - hiddenFateProgress
   - karma/merit/heartDemon
   - flags
5. 实现 cooldown。
6. 实现 repeatPenalty。
7. 当候选不足时使用 fallback 日常事件。
8. 添加 debug output，可解释某事件为什么被抽中。

验收：
- 雷灵根角色更容易抽雷雨类事件。
- 药铺学徒更容易抽药理类事件。
- 同事件不会短期连续触发。
- 不满足 condition 的事件不会进入候选。
- npm run typecheck
- npm test
