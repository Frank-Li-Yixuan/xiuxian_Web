> Deprecated / legacy reference only (SIM-REDESIGN).
> Do not execute this prompt directly. Reason: legacy home unlock follows the fixed A18 outer-battlefield chain instead of the AdultNode/first-trial bridge.
> Replacement route: MIG-C009 plus SIM-C010.

# A18-C006：系统家园开启计划

目标：第一战成功后生成 `SystemHomeUnlockPlan`，开启草创洞府。

任务：

1. 实现 `buildSystemHomeUnlockPlan(profile, resolution, firstBattleSettlement)`。
2. 默认解锁：
   - 草庐
   - 聚灵阵基
   - 藏经残壁
   - 系统核心
   - 试炼玄坛（仅域外战场）
3. 根据 homeHooks 解锁条件模块：
   - 残破丹炉
   - 炼器石台
   - 清心泉眼
   - 符案
4. 发放 initialResources。
5. 生成 nextMainObjectives。
6. 更新 Profile saveStage 为 system_home_unlocked / dongfu。

测试：

- 第一战成功生成 unlock plan
- 药铺铜炉可解锁炼丹线索
- 残破木剑可解锁炼器线索
- 功德高可给 home stability bonus
- 不重复发放 initialResources
