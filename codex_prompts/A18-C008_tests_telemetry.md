> Deprecated / legacy reference only (SIM-REDESIGN).
> Do not execute this prompt directly. Reason: legacy A18 tests assert the old life_simulation_completed -> age18_awakening -> outer_battlefield_pending route instead of AdultNode path scoring.
> Replacement route: MIG-C009/SIM-C010, then SIM-C011.

# A18-C008：测试与遥测

目标：补齐 18 岁觉醒、第一战、家园开启的测试与调试输出。

任务：

1. 单元测试：
   - deterministic resolution
   - stat conversion
   - hidden fate reveal
   - carried item conversion
   - destiny projection
   - run config build
   - home unlock plan
2. 集成测试：
   - life_simulation_completed → age18_awakening → outer_battlefield_pending
   - first battle failed retryable
   - first battle cleared → system_home_unlocked
3. 泄露测试：
   - sealed hidden fate 不显示 trueName
4. 预设角色测试：
   - 天妒雷修
   - 苟道丹修
   - 废灵剑修
   - 魔心禁修
5. 遥测：
   - awakeningScore
   - reveal count
   - converted item tier
   - first battle attempts
   - home unlock modules
6. 命令：
   - npm run typecheck
   - npm test
   - npm run build
   - npm run validate:data
   - npm run check:forbidden

验收：

- 所有测试通过
- 没有 Math.random
- 没有重复结算
- 没有 debug_run_config 进入第一战路径
