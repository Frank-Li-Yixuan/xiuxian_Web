# ME2-C006：事件效果应用与日志 v2

目标：应用 v0.2 月度事件效果，并写入可读日志。

实现：
1. visibleEffects 应用于可见状态。
2. hiddenEffects 应用于内部状态。
3. 日志只展示 visibleText 和 visibleEffects 摘要。
4. hidden trueName 不得出现在日志。
5. 实现日志压缩：
   - 快速模式折叠 breath
   - thread/omen/pressure 不折叠
6. 实现 llmBrief fallback 模板，但不调用外部 LLM。

验收：
- 日志生成
- 隐藏效果生效但不泄露
- 快速推演日志可压缩
- npm run typecheck
- npm test
