# Codex 执行顺序：凡域边地世界观接入 v0.1

这份世界观文档暂时不是立刻大改代码，而是为 LM/MLC/DeepSeek 文案管线提供世界语境、标签和校验规则。

建议分 3 步实现。

## WORLD-C001：世界观数据 Schema 与 Registry

目标：接入世界层级、地点、势力、事件标签数据。

## WORLD-C002：事件设置标签校验

目标：要求每个月度事件/半年选择必须有 settingTag、truthLevel、worldTags。

## WORLD-C003：世界观词典与文案约束

目标：为本地模板和 LLM prompt 提供允许词、禁用词、地点词、势力词。

WORLD-C004 / WORLD-C005 暂无独立 prompt 文件；相关玩法插曲包装和一致性测试应在后续 WORLD-C002/C003 或专门补充 prompt 中明确范围后再执行。
