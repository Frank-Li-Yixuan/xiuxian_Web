# 双人雷霆战机修仙版 · v0.1 项目地基包

本目录是《局内战斗垂直切片 v0.1》的第一批文档与数据表草案。

## 核心修正

本包明确将两套局内成长系统剥离：

1. **灵气经验 / Insight EXP**
   - 高频获取。
   - 来源：击杀妖兽、拾取灵气球。
   - 作用：触发“时停顿悟三选一”。
   - 改变：法术、功法、天赋、体质、丹药、局内法宝/灵宝等 Build 内容。

2. **修为 / Cultivation**
   - 低频但关键。
   - 来源：局内周天吐纳、丹药、天材地宝、精英/Boss 材料、特定顿悟词条。
   - 作用：触发境界瓶颈与突破。
   - 改变：精、气、神等生命本质层面的面板质变，以及槽位/机制解锁。
   - 局内突破：动态雷劫叠加到当前战斗。
   - 局外突破：进入独立雷劫关卡。

## 文件结构

```text
docs/
  progression_split.md
  vertical_slice_v0_1_patch.md
  next_docs_roadmap.md

src/types/
  combat-data.ts

data/
  artifacts/artifacts.v0.1.json
  treasures/spirit_treasures.v0.1.json
  spells/spells.v0.1.json
  pills/pills.v0.1.json
  enemies/enemies.v0.1.json
  bosses/bosses.v0.1.json
  stages/stage_01_qingyun.v0.1.json
  rewards/drop_tables.v0.1.json
  rewards/reward_pools.v0.1.json
  progression/insight_exp_tables.v0.1.json
  progression/cultivation_realms.v0.1.json
  events/tribulations.v0.1.json
  run/debug_run_config.v0.1.json
```

## Codex 开发建议

优先实现顺序：

1. `src/types/combat-data.ts`
2. `data/run/debug_run_config.v0.1.json`
3. `data/stages/stage_01_qingyun.v0.1.json`
4. `data/enemies/enemies.v0.1.json`
5. `data/artifacts/artifacts.v0.1.json`
6. `data/spells/spells.v0.1.json`
7. `data/progression/insight_exp_tables.v0.1.json`
8. `data/progression/cultivation_realms.v0.1.json`
9. `data/events/tribulations.v0.1.json`

第一版先把“能进入青云山、能打完 5 个小阶段、能顿悟、能看到修为条、能触发动态雷劫测试事件”跑起来。
