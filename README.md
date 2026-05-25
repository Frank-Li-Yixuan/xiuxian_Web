# 角色创建与天命开局页面实现文档 v0.1

本包用于交给 Codex 分阶段实现“修仙模拟器创建角色页面”。

当前目标不是完成整个人生模拟器，而是先把以下链路跑通：

```text
开始菜单 / 新的游戏
  → 存档位
  → 创建角色页面
  → 抽命 / 锁定 / 重 Roll
  → 确认此生
  → 写入 Profile 草稿
  → 进入 LifeSimulationScreen 占位或真实人生模拟入口
```

包内文件：

```text
docs/character_creation_implementation_v0.1.md   主实现文档
docs/ui_asset_contract_v0.1.md                   UI 资产接入契约
docs/codex_execution_order_v0.1.md               Codex 分阶段执行顺序
data/character_creation/*.json                   第一批可用数据草案
src/types/character-creation-types.v0.1.ts       TypeScript 类型草案
codex_prompts/*.md                               可逐条投喂 Codex 的 prompt
```

硬约束：

- 只实现浏览器 UI / app routing / profile draft，不改 `src/sim/**`。
- 当前项目没有 React 依赖，默认用 vanilla TypeScript DOM 组件。
- 所有中文文字由 DOM 渲染，不能烘焙在图片中。
- 生成的 UI PNG 只作为背景、边框、按钮状态、卡牌框。
- 创建角色页面必须支持鼠标点击。
- 重 Roll 必须能锁定命格并保留锁定项。
