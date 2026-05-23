# Review Prompt — Determinism and Module Boundaries

请审查当前仓库的确定性模拟边界。

## 必须检查
1. `src/sim/**` 中是否出现禁用 API：`Math.random`、DOM、Canvas、真实时间、Audio、fetch、localStorage。
2. gameplay 时间是否全部使用 frame，而非浮点 dt 秒数。
3. RNG 是否通过 SeededRng stream 注入。
4. StateHash 是否排除了粒子、浮字、UI、音效、真实 FPS。
5. UI/Renderer 是否只读 ViewState/EffectEvents。
6. 是否存在把灵气经验当成修为的命名或逻辑。

## 输出
- 发现的问题，按 Blocker / Major / Minor 分类。
- 每个问题的文件路径、原因、建议修复。
- 如果无问题，说明你检查了哪些路径和命令。
