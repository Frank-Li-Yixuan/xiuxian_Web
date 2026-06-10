# Prompt 状态与废弃说明 v0.1

## 1. 已导入或可保留的系列

| 系列 | 状态 | 处理 |
|---|---|---|
| BAS-C001~BAS-C012 | 已执行 | 保留资产/VFX/Audio 管线，暂不重复执行 |
| OAG v0.1 | 已完成基础实现 | 需要被 NPF/DEM 规则覆盖和升级 |
| DT v0.1 | 已完成基础实现 | 需要被 DEM v0.1 覆盖和升级 |
| HFO-C001~C006 | 已完成基础实现 | 作为 HFO2 v0.2 迁移来源，不直接推进 18 岁转化 |
| WORLD-C001~C003 | 已导入 | 世界观底座；推荐下一步从 `WORLD-C001_data_schema_registry.md` 开始，然后进入 NPF |
| NPF-C001~C006 | 已导入 | 等待 WORLD schema/validator 口径明确后接入 |
| DEM-C001~C007 | 已导入 | 等待 NPF registry/scoring 后接入 |
| HFO2-C001~C008 | 已导入 | 替代旧 HFO-C007/C008 年龄转化路径 |
| LST/LPI/LSTG/ME2/MC2/LLM/LFP | 已导入 | 按 execution order 分阶段执行 |
| CCUI2 | 运行时基准存在 | 当前没有 `CCUI2-C001~C006` 独立 prompt 文件 |

## 2. 明确废弃

旧角色创建、旧人生模拟和旧成年节点 prompt：

```text
CC-C001_data_types_generator.md
CC-C002_ui_asset_registry.md
CC-C003_dom_components.md
CC-C004_character_creation_screen_layout.md
CC-C005_interactions_profile_save.md
CC-C006_app_routing_integration.md
LM-C001~LM-C008
MLC-C001~MLC-C007
A18-C001~A18-C008
HFO-C007_age18_conversion.md
HFO-C008_tests_telemetry.md
```

废弃原因：

```text
1. CC-C 与当前 DOM UI System 方向冲突，可能恢复 generated PNG 控件或旧左中右布局。
2. LM/MLC 是旧 v0.1 life sim 直接集成路线，不读取 LST/LPI/LSTG/ME2/MC2。
3. A18 硬绑定 18 岁觉醒与域外战场路径，缺少成年节点 path scoring。
4. HFO-C007/C008 绑定旧 18 岁隐藏身世/随身物转化，应由 HFO2 + MIG-C009 / SIM-C010 接管。
```

处理方式：不移动文件，保留历史路径，只在文件顶部加 Deprecated 注释。

## 3. 已导入的新推荐系列

```text
WORLD-C001~C003
NPF-C001~C006
DEM-C001~C007
HFO2-C001~C008
LST-C001~C007
LPI-C001~C008
LSTG-C001~C008
ME2-C001~C008
MC2-C001~C008
LLM-C001~C008
LFP-C001~C009
SIM-C001~C011
MIG-C001~C009
E2E-SIM-001
RC-SIM-001
```

仍缺失的占位/规划 prompt：

```text
POST-BAS-001
CCUI2-C001~C006
STG-R001~R002
E2E-C001
RC-C001
```

## 4. 执行旧 prompt 时必须加的全局前缀

见：

```text
codex_prompts/00_GLOBAL_PREFIX_SIM_REDESIGN.md
```
