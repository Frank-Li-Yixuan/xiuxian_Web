# Codex Prompts — v0.1 First Playable 最新版

这些 prompt 按当前完整项目进度重写，适合从空仓库开始交给 Codex 逐步搭建工程。

## 官方使用建议对应
- 复杂任务先让 Codex 进入计划模式或先产出计划。
- 可复用规则放在仓库根目录 `AGENTS.md`。
- 每个任务 prompt 只给一个明确目标和停止条件。
- 每个任务明确必须先读哪些文件、允许改哪些文件、禁止做什么、用哪些命令验收。

## 使用顺序

1. 把本总包中的 `AGENTS.md` 复制到目标代码仓库根目录。
2. 把 `implementation_assets/data/**` 放入目标仓库 `data/**`。
3. 把 `implementation_assets/types/**` 作为类型草案参考。
4. 在 Codex 中先提交 `00_SESSION_BOOTSTRAP.md`。
5. 然后逐个执行 `fp_tasks/FP-C001...FP-C024`。
6. 每完成 3–5 个任务，执行 `review_and_qa/REVIEW_DETERMINISM_AND_BOUNDARIES.md` 或对应审查 prompt。

## 不建议一次性提交所有任务
不要让 Codex 一次完成全部 v0.1。这个项目的关键风险是确定性模拟、数据契约和模块边界。应小步提交、小步测试。
