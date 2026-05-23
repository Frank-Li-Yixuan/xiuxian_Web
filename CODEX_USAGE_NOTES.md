# CODEX_USAGE_NOTES — 使用提示

## 推荐工作流
1. 在目标代码仓库根目录放入 `AGENTS.md`。
2. 使用 Codex 计划模式或先提交 `codex_prompts/00_SESSION_BOOTSTRAP.md`。
3. 每次只执行一个 `fp_tasks` prompt。
4. 每个任务完成后运行 prompt 中列出的验收命令。
5. 每 3–5 个任务执行一次审查 prompt。

## 为什么这样做
这个项目的工程风险不是“能不能画出效果”，而是：
- 确定性模拟是否稳定。
- 双轨成长是否不混淆。
- UI/Renderer 是否不污染 gameplay。
- 数据表是否能驱动内容。
- 第一版是否能形成完整局内/局外闭环。

## Prompt 结构原则
每个 prompt 都包含：一个目标、停止条件、必须阅读文件、允许修改范围、禁止事项、验收命令和最终回复格式。
