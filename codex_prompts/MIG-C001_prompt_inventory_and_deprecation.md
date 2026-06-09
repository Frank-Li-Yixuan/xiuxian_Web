# MIG-C001：Prompt Inventory 与 Deprecated 标记

目标：整理 codex_prompts 目录，标记旧 prompt，避免后续误执行。

任务：

1. 扫描 codex_prompts/。
2. 生成 docs/codex_prompt_inventory_v0.1.md。
3. 标记以下 prompt 为 deprecated：
   - 旧 CC-C001 ~ CC-C006，如果它们仍假设 PNG UI 或旧布局。
   - 任何旧角色创建 PNG 控件集成 prompt。
   - 任何旧 LM/MLC 直接 UI 集成、但未读取 LST/LPI/LSTG/ME2/MC2 的 prompt。
   - 任何写死 18 岁必定域外的 prompt。
4. 不删除文件，只在文件顶部加 Deprecated 注释，或移动到 codex_prompts/deprecated/，二选一，优先不破坏历史路径。
5. 新增 codex_prompts/README_EXECUTION_ORDER.md，引用 docs/prompt_execution_order_v0.1.md。

禁止：

- 不改 src/sim/**。
- 不改游戏逻辑。

运行：

npm run typecheck
npm test
npm run build

最终回复：

- 标记了哪些 prompt
- 哪些 prompt 仍可执行
- 哪些 prompt 缺失
