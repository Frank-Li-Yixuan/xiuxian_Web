> Deprecated / legacy reference only (SIM-REDESIGN).
> Do not execute this prompt directly. Reason: legacy LM v0.1 event effects/logs are not LST/LPI/LSTG/ME2-aware and are superseded by MIG-C004 plus SIM-C006.
> Keep this file only as source context for migration.

# LM-C004：事件效果应用器与日志

范围：
- 实现 LifeEffect 应用。
- 实现 MonthlyLifeLogEntry。
- 隐藏效果不得泄露隐藏命真名。

任务：
1. 实现 applyLifeEffects(state, effects, visibility)。
2. 支持 effect kind：
   - core
   - aptitudeSoft
   - lifeSkill
   - merit
   - karma
   - state
   - hiddenFateProgress
   - itemAffinity
   - destinyProgress
   - majorChoiceHook
   - age18Hook
   - modeBias
   - dongfuHook
   - tag
   - lifeEventBias
3. 实现 caps：
   - core before 18 soft cap 150
   - aptitude soft cap 120
   - karma/merit/heartDemon cap
4. 实现 wounds / heartKnots / flags 写入。
5. 实现 buildMonthlyLogEntry。
6. hiddenEffects 对日志只显示 vague summary：
   - “隐藏预兆略有变化”
   - “某件旧物似乎与你更亲近”
   - 不显示古雷真血、丹圣遗骨等真名。
7. 添加测试：日志不泄露隐藏真名。

验收：
- visible effects 改变 state。
- hidden effects 改变 internal state。
- log 有可读中文。
- log 不泄露 hidden true name。
- npm run typecheck
- npm test
