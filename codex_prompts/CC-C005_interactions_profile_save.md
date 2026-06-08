> Deprecated / legacy reference only (SIM-REDESIGN).
> Do not execute this prompt directly. Reason: it belongs to the old CC-C flow and should not be used to drive the current CCUI2/SIM-REDESIGN character-creation route.
> Replacement route: CCUI2 baseline, then MIG-C003/SIM-C008.

# CC-C005：创建角色交互与存档写入

目标：让创建角色页面可操作，能保存角色并进入人生模拟入口。

## 任务

1. 接入“重新推演”：
   - 点击后 reroll 未锁定项。
   - 锁定项保持不变。
2. 接入锁定按钮：
   - 可锁定灵根、主命格、副命格、缺陷命格、出身、隐藏预兆。
   - 第一版最多允许 2 个锁定项。
3. 接入名字输入：
   - 非空校验。
   - 默认“无名散修”。
4. 接入“确认此生”：
   - 校验 draft 完整。
   - 写入 profile.characterOrigin。
   - profile.profileStage = "life_simulation"。
   - 保存 localStorage。
   - 路由到 LifeSimulationScreen placeholder。
5. 如果当前项目已有 SaveSlotService，则复用；没有则实现最小版本。

## 测试

1. reroll 后未锁定字段变化。
2. 锁定字段 reroll 后保持。
3. 空名字不能确认。
4. 确认后写入 characterOrigin。
5. 确认后进入 life_simulation。

## 禁止

- 不要直接进入 battle。
- 不要修改 src/sim/**。
