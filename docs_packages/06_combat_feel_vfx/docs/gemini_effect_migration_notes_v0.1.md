# Gemini Demo 特效迁移说明 v0.1

## 1. 可以继承的方向

Gemini Demo 中适合保留为“视觉方向参考”的部分：

- Canvas 2D 发光边框与 `shadowBlur`。
- 背景拖影，营造纵向高速卷轴感。
- 爆炸粒子、命中火花、浮字。
- Boss 血条、Boss 名称、Boss 入场。
- 天劫/警告大字。
- 时滞滤镜和屏幕震动。
- 飞剑、敌弹、敌人几何图形程序绘制。

这些方向符合“不依赖外部图片资源”的目标。

## 2. 必须重写的结构

Demo 结构不能直接继承：

- 单 HTML 文件中混合 UI、逻辑、渲染、输入。
- Gameplay 中直接读取全局 `keys`。
- Gameplay 中大量直接调用 `Math.random()`。
- `dt` 浮点时间同时驱动玩法和视觉。
- 掉落、敌人刷新、Boss 随机与粒子随机没有分层。
- 复活用随机道具触发，不符合“精血渡魂”正式机制。
- 外部 Tailwind CDN 与 Google Fonts 不符合 v0.1 无外部资源约束。

## 3. 迁移策略

```text
视觉感觉可以参考，代码结构不要搬。
```

正式实现应拆成：

```text
CombatSimulation 只发 EffectEvent
VfxRegistry 根据数据表解释 EffectEvent
CanvasRenderer 根据 LayerStack 绘制
ParticlePool 统一管理粒子生命周期
ScreenShakeManager 只修改 render camera
ProceduralAudioBus 播放程序音效
```

## 4. 对照表

| Demo 机制 | 正式机制 |
|---|---|
| `createExplosion(x,y,color,count)` | `EffectEvent(effectId, position, intensity)` |
| `triggerShake(intensity,duration)` | `ScreenShakeProfile` + render-only camera offset |
| `FloatingText` 直接创建 | `CombatPromptEvent` 或 `EffectEvent` |
| `Math.random()` 粒子 | `visualRng` |
| `Math.random()` 掉落/Boss | `dropRng` / `bossRng` |
| Tailwind/Google Font | 本地 CSS + 系统字体栈 |
| 按键射击 | 本命法宝自动普攻 |
| REVIVE 道具 | 精血渡魂系统 |

## 5. 首批迁移建议

1. 先复刻背景拖影和简单粒子，但放进 `render/effects`。
2. 再复刻敌弹红白核心，可读性优先。
3. 然后实现飞剑、火息、重印三个法宝效果。
4. 最后实现 Boss 警告、雷劫预警、突破清场。

不要先实现大规模粒子爆炸，否则很容易掩盖核心手感问题。
