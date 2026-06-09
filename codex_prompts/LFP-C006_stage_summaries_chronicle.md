# LFP-C006：Stage Summaries and Life Chronicle

目标：实现四个年龄阶段总结与人生日志回看。

任务：
1. 在 3/8/13/17 岁阶段结束时进入 stage_summary。
2. 生成阶段总结 ViewState。
3. 展示：主要经历、属性变化、主线变化、隐藏预兆变化、随身物变化。
4. 支持日志回看：全部日志 / 重大事件。
5. 生成 18 年人生小传草稿，供 adult node 使用。
6. 默认使用本地模板，不强依赖 LLM。

验收：
- 每个阶段结束有总结。
- 总结不泄露 hidden trueName。
- 日志可回看。
- npm run typecheck / npm test / npm run build。
