# GLOBAL PREFIX: SIM-REDESIGN v0.1

在执行任何旧 prompt 或新 prompt 前，必须遵守以下覆盖规则：

- 当前 UI 路线是场景化 DOM / React + 本地 UI System + CSS/Tailwind tokens + Motion。不要恢复 generated PNG 控件拼装方案。
- generated image 只用于背景、图标、插画、VFX 纹理、角色/物体素材，不作为按钮、弹窗、命格卡、存档卡的主要交互控件。
- 角色创建页面主视觉是黑色打坐小人 + 命盘法阵 + 灵根/天命特效层，不是全身立绘布局。
- 规则引擎决定数值、事件、成功失败、隐藏进度；LLM 只能润色文本。
- 不要在 UI 或日志中泄露 hidden trueName，除非系统已经明确揭示。
- 不要把 18 岁硬写成唯一域外战场出口；默认成年节点可以 fallback 到域外，但需要支持路径评分。
- 除非任务明确要求，不要修改 src/sim/**。
- 不要让 combat 或 UI 直接调用 Math.random；规则生成必须使用 Seeded RNG。
- 不要引入外部 CDN、外部字体、外部远程图片。
- 每个任务结束必须运行：npm run typecheck、npm test、npm run build。
- 若项目存在，也运行：npm run validate:data、npm run check:forbidden、npm run validate:combat-assets。
- 最终回复必须包含：修改文件、测试结果、是否改动 src/sim/**、手动验证步骤、已知问题。
