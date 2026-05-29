# 【全局执行前缀：必须覆盖旧文档中的冲突内容】

当前项目 UI 路线已更新：
- 不再使用 generated PNG 作为按钮、面板、存档卡、弹窗、命格卡等交互控件。
- 前端控件统一使用场景化 DOM / React 组件 + 本地 src/app/ui-system/ + CSS/Tailwind tokens + Motion 动效。
- generated image 只可用于背景、插画、图标、法宝、人物、敌人、VFX 纹理、特效贴图，不可作为主要交互控件。
- 不要恢复旧的 PNG 控件拼装方案。
- 不要使用旧的左中右角色立绘布局。
- 角色创建页面主视觉必须是“黑色打坐小人 + 命盘法阵 + 灵根/天命特效层”，不是全身角色立绘。
- 页面文字全部 DOM 渲染。
- 不引入外部 CDN、外部字体、外部图片链接。
- 不要整仓复制 shadcn/awesome 仓库；只参考设计模式。
- 若 prompt 中提到 PNG 控件、image asset button、切图、manifest 控件装配，以本前缀为准，改为 DOM/CSS 组件实现。
- 除非当前任务明确要求，否则不要修改 src/sim/**。
- 每次任务后必须运行：npm run typecheck、npm test、npm run build。
- 如果有 validate:data、check:forbidden、validate:combat-assets，也一起运行。
