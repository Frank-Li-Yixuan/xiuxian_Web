> Deprecated / legacy reference only (SIM-REDESIGN).
> Do not execute this prompt directly. Reason: it belongs to the old CC-C routing flow and should not be used to override the current CCUI2/SIM-REDESIGN app flow.
> Replacement route: CCUI2 baseline, then MIG-C003/SIM-C008.

# CC-C006：接入新游戏路由

目标：把 CharacterCreationScreen 接入新游戏主流程。

## 正确流程

```text
MainMenuScreen
  → New Game
  → SaveSlotScreen(mode="new")
  → CharacterCreationScreen
  → LifeSimulationScreen
```

Continue：

```text
MainMenuScreen
  → Continue Game
  → SaveSlotScreen(mode="continue")
  → 根据 profileStage 恢复页面
```

## 任务

1. 新增或更新 AppRouter。
2. 新建存档后不要直接进入 battle。
3. 如果 profileStage = character_creation，进入 CharacterCreationScreen。
4. 如果 profileStage = life_simulation，进入 LifeSimulationScreen。
5. 如果 profileStage = dongfu_unlocked，进入 OutgameHomeScreen。
6. Debug battle 只能在 DEV flag 下存在。
7. 保留已有战斗代码，但从正常新游戏路径移除 debug_run_config 直启。

## 验收

- App 启动显示 Main Menu。
- New Game 进入 Save Slot。
- 空存档创建后进入 Character Creation。
- Confirm Life 后进入 Life Simulation。
- Continue 能恢复未完成阶段。
- 测试通过。
