# WORLD-C002：事件世界语境校验

目标：为月度事件和半年选择添加世界观一致性校验。

任务：
1. 创建 validateLifeEventWorldContext(event)。
2. 每个事件必须包含：
   - settingTags
   - worldTags
   - truthLevel
3. 根据 ageMonths/phase 校验 truthLevel 是否允许。
4. 根据 ageMonths/phase 校验 gameplayInterlude 是否允许。
5. 禁止事件可见文本出现 forbiddenModernTerms。
6. 禁止可见文本泄露 hidden trueName。
7. 输出清晰错误。

不做：
- 不改事件生成算法。
- 不改 src/sim/**。

验收：
- 加测试覆盖：低龄真实战斗不允许；现代词汇不允许；隐藏真名不允许。
