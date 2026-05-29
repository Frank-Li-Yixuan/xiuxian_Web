# A18-C003：属性转化与第一战修正

目标：把 18 岁最终人生属性转化为域外战场第一战初始战斗属性。

任务：

1. 实现 softCap(value, cap, softness)。
2. 实现 convertFinalLifeStatsToOuterBattlefieldStart(stats, modifiers)。
3. 使用 data/age18/stat_conversion_tables.v0.1.json 中公式：
   - maxHp
   - maxQi
   - pickupRadius
   - critChance
   - passiveQiRegen
   - spellInsightBonus
   - dropLuckBonus
   - heartDemonResist
4. 实现伤病 / 心结 / 功德 / 业力修正。
5. 加 safety floor，避免第一战无法游玩。
6. 输出 OuterBattlefieldPlayerStart。
7. 不改 src/sim/**。

测试：

- 普通预设属性结果在合理范围
- 极端高属性被 soft cap
- 重伤会降低 maxHp，但不低于 safety floor
- 功德高产生保命修正
- 业力高产生危险与奖励修正
