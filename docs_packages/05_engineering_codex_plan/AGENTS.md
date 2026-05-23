# AGENTS.md — 双人雷霆战机修仙版工程约定 v0.1

本文件适用于整个仓库。任何自动化编码代理在修改本项目时必须遵守以下规则。

## 项目目标

构建一个 PC 端宽屏垂直卷轴 STG + Roguelike + 修仙局外养成游戏。第一阶段目标是完成第一大阶段“青云山·妖潮初临”的可玩垂直切片。

## 不可违反的工程规则

1. Gameplay Simulation 必须确定性。
2. Gameplay 代码禁止直接调用 `Math.random()`。
3. Gameplay 代码禁止直接读取 DOM、Canvas、浏览器键盘事件或真实时间。
4. Gameplay 逻辑以固定 60 FPS 帧推进，冷却、消化、Boss 时间轴、雷劫持续时间都使用 frame 计数。
5. 所有随机从 `SeededRng` 流获得，并区分 gameplay/stage/drop/reward/boss/tribulation/visual。
6. UI 和 Renderer 只能读取 ViewState，不允许修改 Simulation State。
7. Canvas 特效、粒子、浮字、音效、震屏不能进入 gameplay hash。
8. 数据文件必须通过 schema/validator 校验后才能进入运行时。
9. 新增或修改 gameplay 行为必须补测试；至少包括 unit test 或 headless determinism test。
10. 不允许引入外部图片、外部字体、CDN 样式表或运行时远程资源。开发依赖可以使用 npm 包，但 runtime 资产必须本地生成或代码绘制。

## 命名规则

- TypeScript 类型和类：`PascalCase`。
- 函数、变量：`camelCase`。
- 数据 ID：`snake_case_ascii`，例如 `spell_five_thunder`。
- 中文显示名保留在 `name.zhCN` 或 `displayName` 字段中。
- JSON 数据文件使用 `.v0.1.json` 版本后缀，后续版本逐步迁移。

## 建议命令

修改代码后优先运行：

```bash
npm run typecheck
npm run lint
npm test
npm run test:determinism
npm run validate:data
npm run check:forbidden
```

## 修改范围建议

- 一次任务只改一个系统或一个模块边界。
- 不要在同一个任务里同时改 Simulation、Renderer、UI、Netcode。
- 不要用大重构掩盖功能实现。
- 新系统先写类型和测试，再接入运行时。

## Codex 工作方式

每次任务开始前先阅读：

1. `docs/engineering_architecture_and_codex_plan_v0.1.md`
2. `docs/module_boundaries_v0.1.md`
3. 当前任务对应的 `docs/codex_prompts/*.md`
4. 当前系统相关的设计文档和 JSON 数据文件

完成任务时输出：

- 修改了哪些文件。
- 新增了哪些测试。
- 哪些验收项已经通过。
- 哪些问题仍未解决。
