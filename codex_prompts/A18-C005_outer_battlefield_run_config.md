> Deprecated / legacy reference only (SIM-REDESIGN).
> Do not execute this prompt directly. Reason: it fixes the first post-life route to `outer_battlefield_intro`; current design requires AdultNode path scoring with outer battlefield only as a possible fallback.
> Replacement route: MIG-C009 plus SIM-C010.

# A18-C005：域外战场第一战 RunConfig

目标：从 Age18AwakeningResolution 生成第一战 `OuterBattlefieldIntroRunConfig`。

任务：

1. 实现 `buildOuterBattlefieldIntroRunConfig(resolution, registry, seed)`。
2. modeId 固定为 `outer_battlefield_intro`。
3. 使用 outer_battlefield_intro_run 数据中的 scenario phases。
4. 构建 playerProfile：
   - combat stats
   - initial loadout
   - modifiers
5. 保底规则：
   - 没有本命法宝时给 `artifact_nameless_flying_sword_damaged`
   - 生命过低时给 `pill_rejuvenation`
6. failurePolicy 必须 retryable。
7. 禁止读取 debug_run_config。
8. 不改常规战斗系统之外的 sim 逻辑。

验收：

- RunConfig modeId 正确
- phases 时间递增
- failurePolicy.retryable = true
- 不含 debug_run_config 路径
- 不同人生结果导致 loadout / modifier 不同
