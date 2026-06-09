# SIM-C008：18 年人生模拟可玩 UI 与存档

## 目标

实现 LFP 首版可玩体验：自动月度播放、半年选择、插曲入口、阶段总结、存档恢复。

## 硬约束

- 先阅读 `codex_prompts/00_GLOBAL_PREFIX_SIM_REDESIGN.md`。
- 不要恢复旧 PNG 控件 UI。
- 不要执行废弃的 `CC-C001~CC-C006`。
- 除非本任务明确要求，不修改 `src/sim/**`。
- 不要让 LLM 决定数值或规则结果。

## 任务


1. 重做 LifeSimulationScreen。
2. 实现播放速度、暂停、播放到下一选择、阶段总结。
3. 接入 MajorChoice UI 与 InterludePrompt UI。
4. 实现 LifeChronicle / 人生日志。
5. 实现刷新恢复。


## 验收


- 创建角色确认后进入 LifeSimulationScreen。
- 每半年停顿选择。
- 选择后继续自动播放。
- 216 月进入成年节点 pending。


## 必跑命令

```text
npm run typecheck
npm test
npm run build
npm run validate:data
npm run check:forbidden
```

如果某命令不存在，记录为 missing，不要临时发明命令。

## 最终回复

- 修改文件列表
- 测试结果
- `git diff --name-only -- src/sim` 结果
- 手动验证步骤
- 已知问题
