# Codex Acceptance Prompt Template

你正在实现《双人雷霆战机修仙版》v0.1 First Playable。执行任务前必须阅读：

1. `AGENTS.md`
2. `docs/first_playable_integration_acceptance_v0.1.md`
3. 当前任务对应的设计文档与数据表

## 当前任务

任务 ID：`<填入 FP-Cxxx>`  
目标：`<填入目标>`  
允许修改范围：`<填入文件/目录>`  
禁止修改范围：`<填入文件/目录>`

## 必须遵守

- 不在 `src/sim/**` 中使用 `Math.random`、DOM、Canvas、真实时间、Audio。
- Gameplay 时间使用 frame，不使用浮点 dt 作为权威状态。
- UI 只读 ViewState。
- Renderer 不修改 SimState。
- Simulation 不创建粒子、不播放声音，只发 EffectEvent。
- 不新增外部 CDN、外部字体、外部图片、外部音频。
- 新增 gameplay 行为必须补测试。

## 完成后运行

```bash
npm run typecheck
npm test
npm run validate:data
npm run check:forbidden
```

如当前任务涉及确定性，还必须运行：

```bash
npm run test:determinism
```

## 输出要求

请给出：

1. 修改文件列表。
2. 实现摘要。
3. 测试结果。
4. 任何未完成项或风险。
