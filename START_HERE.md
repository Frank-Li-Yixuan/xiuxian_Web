# START_HERE — 双人雷霆战机修仙版 v0.1 项目文档总包

本总包收录了本项目目前已经细化完成、进入 Codex 开发所需的完整 v0.1 文档、数据表、类型草案、验收清单和 Codex prompts。

## 使用顺序

### 给人类项目负责人
1. 先读 `PROJECT_DOCUMENT_INDEX.md`。
2. 再读 `docs_packages/08_first_playable_acceptance/docs/first_playable_integration_acceptance_v0.1.md`。
3. 如果要开始开发，按 `codex_prompts/README.md` 的顺序逐个投喂 Codex。

### 给 Codex
1. 把 `AGENTS.md` 放到仓库根目录。
2. 把 `implementation_assets/data/**`、`implementation_assets/types/**` 作为初始内容资产。
3. 先执行 `codex_prompts/00_SESSION_BOOTSTRAP.md`，再按 `codex_prompts/fp_tasks/` 从 FP-C001 开始推进。

## 当前 v0.1 目标

从默认洞府存档出发，进入第一大阶段“青云山·妖潮初临”，完成局内战斗、双人顿悟、修为增长、Debug 雷劫、Boss、救援、结算，回洞府炼丹/炼器/修功/研法，再生成第二局配置并重新进局，玩家能明显感到自己变强。

## 最重要的设计约束

- 灵气经验 ≠ 修为。
- 普攻自动，法术主动，丹药主动且需要消化。
- 本命法宝：局外 1 + 局内 1。
- 灵宝：局外 2 + 局内 2。
- 法术：4 格。
- 丹药：3 格。
- 本地双人 v0.1 必须可玩；在线联机先做确定性同步地基。
- 正式工程不依赖外部图片、字体、CDN 或音频资源。
- Gemini Demo 只作为视觉/手感参考，不继承其单文件全局变量架构。
