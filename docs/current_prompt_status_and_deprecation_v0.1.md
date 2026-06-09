# Prompt 状态与废弃说明 v0.1

## 1. 已完成或可保留的系列

| 系列 | 状态 | 处理 |
|---|---|---|
| BAS-C001~BAS-C012 | 已执行 | 保留资产/VFX/Audio 管线，暂不重复执行 |
| OAG v0.1 | 已完成基础实现 | 需要被 NPF/DEM 规则覆盖和升级 |
| DT v0.1 | 已完成基础实现 | 需要被 DEM v0.1 覆盖和升级 |
| HFO v0.1 | 已完成基础实现 | 需要被 HFO2 v0.2 覆盖和升级 |
| CCUI2 | 已完成 | 保留并作为角色创建 UI 基准 |

## 2. 明确废弃

旧角色创建 prompt：

```text
CC-C001_data_types_generator.md
CC-C002_ui_asset_registry.md
CC-C003_dom_components.md
CC-C004_character_creation_screen_layout.md
CC-C005_interactions_profile_save.md
CC-C006_app_routing_integration.md
```

废弃原因：

```text
1. 与当前 DOM UI System 方向冲突。
2. 可能恢复 generated PNG 控件方案。
3. 可能恢复旧左中右角色立绘布局。
4. 数据逻辑已由 OAG/DT/HFO/NPF/DEM/HFO2 等系统接管。
```

建议移动到：

```text
codex_prompts/deprecated/old_character_creation/
```

## 3. 需要新增的系列

```text
WORLD-C001~C003
NPF-C001~C006
DEM-C001~C007
LST-C001~C007
LPI-C001~C008
LSTG-C001~C008
ME2-C001~C008
MC2-C001~C008
HFO2-C001~C008
LLM-C001~C008
LFP-C001~C009
SIM-C001~C010
```

## 4. 执行旧 prompt 时必须加的全局前缀

见：

```text
codex_prompts/00_GLOBAL_PREFIX_SIM_REDESIGN.md
```
