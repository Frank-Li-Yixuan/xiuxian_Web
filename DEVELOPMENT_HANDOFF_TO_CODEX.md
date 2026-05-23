# DEVELOPMENT_HANDOFF_TO_CODEX — 开发交接说明

## 当前不要继续扩系统
本项目已经具备开工所需文档。接下来应进入工程实施，而不是继续扩展第二大阶段、魂修完整流派、弟子系统或宗门经营。

## 第一批执行顺序

1. `FP-C001_repository_scaffold.md`
2. `FP-C002_seeded_rng.md`
3. `FP-C003_fixed_tick_and_frame_input.md`
4. `FP-C004_content_registry_data_validation.md`
5. `FP-C005_entity_manager_simstate_statehash.md`

这五步完成后，才进入玩家、法宝、敌人和碰撞。

## 为什么先 Headless
本游戏后续要支持在线双人，且局内包含海量弹幕、掉落、Boss、顿悟、雷劫和救援状态。先写 Canvas 会导致逻辑和表现混在一起，后期联机会返工。必须先做可重复的 Headless Simulation，再挂 CanvasRenderer。

## Gemini Demo 使用原则
原 Demo 可以参考：
- 发光粒子
- 浮字
- Boss 血条
- Boss 入场警告
- 屏幕震动
- Canvas 程序绘制风格

原 Demo 不能继承：
- 单 HTML 文件全局变量结构
- Tailwind CDN / Google Fonts
- gameplay 中裸 `Math.random()`
- 直接读 DOM 键盘状态推进玩法
- UI、渲染、模拟混写

## First Playable 成功标准
玩家完成以下体验后才算 v0.1 成功：

1. 我知道灵气满是顿悟，不是境界突破。
2. 我知道修为满会引发境界/雷劫/质变。
3. 我知道丹药要提前吃。
4. 我知道法术是真元驱动的主动破局。
5. 我知道死了也能带资源回洞府。
6. 我知道下一局为什么更强。
7. 我愿意再打一局。
