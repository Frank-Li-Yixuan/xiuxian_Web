# 局外洞府最小闭环 v0.1

本包定义双人雷霆战机修仙版的第一版局外系统：结算、洞府总览、藏经阁、聚灵阵、炼丹房、炼器阁、劫雷台和下局 Loadout。

## 文件结构

```text
xiuxian_outgame_dongfu_v0_1/
  docs/
    off_run_dongfu_min_loop_v0.1.md
    codex_implementation_tasks_v0.1.md
    outgame_economy_checklist_v0.1.md
    outgame_ui_flow_v0.1.md

  data/outgame/
    resources.v0.1.json
    buildings.v0.1.json
    cultivation_methods.v0.1.json
    spell_compendium.v0.1.json
    alchemy_recipes.v0.1.json
    artifact_progression.v0.1.json
    idle_yield.v0.1.json
    breakthrough_trials.v0.1.json
    settlement_rewards_stage01.v0.1.json
    loadout_presets.v0.1.json
    outgame_balance.v0.1.json
    default_profile.v0.1.json
    sample_settlement_receipt_stage01_clear.v0.1.json

  src/types/
    outgame-types.v0.1.ts

  diagrams/
    outgame_loop.mmd
    module_dependencies.mmd

  templates/
    outgame_content_registry.example.ts
```

## 核心规则

- 局内资源 100% 带回洞府。
- 局外修为不等于局内灵气经验。
- 藏经阁中“功”和“法”分离。
- 功可同修多本，但同修越多效率越低。
- 法占局内 4 个法术格，空槽合法。
- 丹药分局内消耗丹、永久属性丹、破境丹。
- 永久丹有丹毒，局内消耗丹不加永久丹毒。
- 本命法宝和灵宝通过炼器阁解锁/升星。
- 劫雷台是局外突破关卡，不提供顿悟三选一。

## 第一版目标

完成一次第一大阶段后，玩家应能：

1. 看到清晰结算。
2. 收取聚灵阵收益。
3. 炼制至少一种局内丹药。
4. 修炼或升级至少一个功/法。
5. 升星至少一个法宝或灵宝，或看到明确材料缺口。
6. 配置下局 Loadout。
7. 再次进入局内。
