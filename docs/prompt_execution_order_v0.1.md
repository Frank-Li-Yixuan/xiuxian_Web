# Codex Prompt 执行顺序 v0.1

## 0. 必须先放入全局前缀

旧 prompt 中可能仍然出现 PNG 控件、旧角色创建布局、直接进入 debug combat 等旧约束。执行任何旧 prompt 前必须贴上：

```text
当前项目 UI 路线已更新：不再使用 generated PNG 作为按钮、面板、卡牌、弹窗等交互控件。前端控件统一使用 DOM / React + 本地 src/app/ui-system/ + CSS/Tailwind tokens + Motion。图片只用于背景、图标、人物、特效、VFX 纹理。不要恢复旧的 PNG 控件拼装方案。角色创建页面主视觉是黑色打坐小人 + 命盘法阵 + 灵根/天命特效层。除非任务明确要求，不要修改 src/sim/**。
```

## 1. 推荐完整顺序

```text
SIM-C001_current_state_audit
SIM-C002_data_registry_unification
SIM-C003_nine_palace_destiny_upgrade
SIM-C004_origin_storyline_item_upgrade
SIM-C005_life_storyline_stage_interlude_core
SIM-C006_monthly_event_v02_upgrade
SIM-C007_major_choice_v02_upgrade
SIM-C008_life_playable_ui_flow
SIM-C009_llm_narrative_offline_first
SIM-C010_adult_node_and_trial_bridge
SIM-C011_e2e_rc_gate
```

## 2. 与已有 prompt 的对应关系

### SIM-C001 后，可继续或替代

```text
POST-BAS-001
```

### SIM-C002 聚合

```text
WORLD-C001~C003
NPF-C001
DEM-C001
LST-C001
LPI-C001
LSTG-C001
ME2-C001
MC2-C001
HFO2-C001
LLM-C001
LFP-C001
```

### SIM-C003 聚合

```text
NPF-C002~C004
DEM-C002~C006
OAG-C001~C005
DT-C001~C006
```

### SIM-C004 聚合

```text
HFO2-C002~C007
HFO-C001~HFO-C008（若旧版尚未接入）
```

### SIM-C005 聚合

```text
LST-C002~C005
LPI-C002~C005
LSTG-C002~C005
```

### SIM-C006 聚合

```text
ME2-C002~C006
LM-C001~C008（若旧版尚未接入，可由 ME2 覆盖）
```

### SIM-C007 聚合

```text
MC2-C002~C007
MLC-C001~C007（若旧版尚未接入，可由 MC2 覆盖）
```

### SIM-C008 聚合

```text
LFP-C002~C007
CCUI2-C001~C006（若角色创建页尚未完成）
```

### SIM-C009 聚合

```text
LLM-C002~C008
```

### SIM-C010 聚合

```text
A18-C001~C008
STG-R001~R002（只做 bridge，不做完整战斗重构）
```

### SIM-C011 聚合

```text
E2E-C001
RC-C001
```

## 3. 最短可跑顺序

如果只想尽快打通体验，不追求全部遥测：

```text
SIM-C001
SIM-C002
SIM-C003
SIM-C004
SIM-C005
SIM-C006
SIM-C007
SIM-C008
SIM-C010
SIM-C011
```

暂缓：

```text
SIM-C009 真实 LLM 接入
完整 STG-R003~R008
完整 3D/虫族/DBG/棋局
```

## 4. 不建议继续执行的旧 prompt

```text
CC-C001~CC-C006
```

若已执行，保留产出中可用的数据/类型，但不要沿用旧 UI 方案。

## 5. 每阶段固定验收命令

```text
npm run typecheck
npm test
npm run build
npm run validate:data
npm run check:forbidden
```

若存在：

```text
npm run validate:combat-assets
npm run validate:3d-assets
npm run validate:2d-assets
```
