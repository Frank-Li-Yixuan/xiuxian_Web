# PROJECT_DOCUMENT_INDEX — v0.1 完整文档索引

## 01 — 局内战斗垂直切片与数据驱动战斗系统
路径：`docs_packages/01_foundation_vertical_slice/`

关键文件：
- `docs/vertical_slice_v0_1_patch.md`
- `docs/progression_split.md`
- `src/types/combat-data.ts`
- `data/stages/stage_01_qingyun.v0.1.json`
- `data/events/tribulations.v0.1.json`

用途：定义第一大阶段、双轨成长、基础数据契约、第一批法宝/灵宝/法术/丹药/敌人/Boss。

## 02 — 核心数值模型
路径：`docs_packages/02_core_balance_model/`

关键文件：
- `docs/core_balance_model_v0.1.md`
- `data/balance/core_balance.v0.1.json`
- `src/types/balance-types.v0.1.ts`

用途：定义玩家基准、DPS、真元经济、灵气经验曲线、修为曲线、雷劫压强、双人倍率。

## 03 — 局内 UI/UX 信息架构
路径：`docs_packages/03_in_run_ui_ux/`

关键文件：
- `docs/in_run_ui_ux_information_architecture_v0.1.md`
- `data/ui/in_run_ui_layout.v0.1.json`
- `data/ui/ui_components.v0.1.json`
- `wireframes/in_run_layout_1920x1080.svg`

用途：定义三栏式宽屏 UI、灵气经验和修为的视觉区分、法术栏、丹药炼化、顿悟界面、雷劫 UI、救援 UI。

## 04 — 联机同步技术设计
路径：`docs_packages/04_netcode_sync/`

关键文件：
- `docs/online_sync_technical_design_v0.1.md`
- `docs/deterministic_simulation_checklist_v0.1.md`
- `data/netcode/sync_protocol.v0.1.json`
- `src/types/netcode-types.v0.1.ts`

用途：定义确定性帧同步、输入延迟、RNG 分层、状态哈希、快照修正、顿悟/雷劫/救援同步。

## 05 — 工程架构与 Codex 实施计划
路径：`docs_packages/05_engineering_codex_plan/`

关键文件：
- `AGENTS.md`
- `docs/engineering_architecture_and_codex_plan_v0.1.md`
- `docs/codex_task_backlog_v0.1.md`
- `docs/module_boundaries_v0.1.md`
- `docs/testing_and_ci_strategy_v0.1.md`
- `scripts/check-forbidden-patterns.mjs`

用途：定义仓库结构、模块边界、Codex 任务拆分、测试/CI、禁用模式检查。

## 06 — 战斗手感与特效规范
路径：`docs_packages/06_combat_feel_vfx/`

关键文件：
- `docs/combat_feel_and_vfx_spec_v0.1.md`
- `docs/vfx_readability_checklist_v0.1.md`
- `data/vfx/render_layers.v0.1.json`
- `data/vfx/spell_vfx_profiles.v0.1.json`
- `data/vfx/tribulation_vfx_profiles.v0.1.json`

用途：定义 STG 可读性、判定点、敌弹、雷劫预警、法术特效、屏幕震动、粒子预算和程序音效。

## 07 — 局外洞府最小闭环
路径：`docs_packages/07_outgame_dongfu_loop/`

关键文件：
- `docs/off_run_dongfu_min_loop_v0.1.md`
- `docs/outgame_ui_flow_v0.1.md`
- `data/outgame/default_profile.v0.1.json`
- `data/outgame/alchemy_recipes.v0.1.json`
- `data/outgame/artifact_progression.v0.1.json`
- `src/types/outgame-types.v0.1.ts`

用途：定义洞府、藏经阁、聚灵阵、炼丹房、炼器阁、劫雷台、结算与第二局配置。

## 08 — First Playable 总集成验收
路径：`docs_packages/08_first_playable_acceptance/`

关键文件：
- `docs/first_playable_integration_acceptance_v0.1.md`
- `docs/feature_scope_matrix_v0.1.md`
- `docs/codex_execution_order_v0.1.md`
- `docs/end_to_end_playtest_script_v0.1.md`
- `docs/release_candidate_checklist_v0.1.md`
- `data/acceptance/first_playable_gate.v0.1.json`

用途：定义 v0.1 必做/不做范围、G0–G8 gate、端到端试玩脚本、集成测试、RC 验收。

## implementation_assets
路径：`implementation_assets/`

用途：把所有最新 JSON 数据、类型草案、模板、脚本、线框图和 Mermaid 图集中到一个便于工程接入的位置。

## codex_prompts
路径：`codex_prompts/`

用途：基于当前完整进度重写的高质量 Codex prompts。按 `README.md` 顺序使用。

## references
路径：`references/`

用途：原始 Gemini Canvas Demo 和 Gemini 对话记录。仅作参考，不作为正式工程结构。
