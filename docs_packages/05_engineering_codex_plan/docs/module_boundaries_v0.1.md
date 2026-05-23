# 《模块边界与导入规则 v0.1》

## 1. 目标

本文件用于防止工程退化为 Gemini Demo 式单文件全局变量结构。核心目标是确保 Simulation、Renderer、UI、Input、Netcode 清晰分层。

---

## 2. 允许导入矩阵

| From \ To | sim/core | sim/content | sim/entities | sim/systems | sim/view | render | ui | input | net | debug |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| sim/core | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| sim/content | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| sim/entities | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| sim/systems | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| sim/view | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| render | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| ui | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| input | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| net | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ |
| debug | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 3. Simulation 禁止项

`src/sim/**` 中禁止：

```text
window
document
canvas
CanvasRenderingContext2D
performance.now
Date.now
setTimeout
setInterval
requestAnimationFrame
Math.random
fetch
localStorage
Audio
```

例外：测试文件可以使用真实时间统计性能，但不能影响断言结果。

---

## 4. Renderer 禁止项

`src/render/**` 中禁止：

```text
修改 SimState
调用 CombatSimulation.tick
生成 gameplay drop/reward/enemy
写入 EntityManager
```

Renderer 只能消耗 ViewState。

---

## 5. UI 禁止项

`src/ui/**` 中禁止直接写：

```text
player.hp
player.qi
teamInsight.exp
cultivation.cultivation
spell.cooldownFrames
pill.remainingFrames
```

UI 输入必须转为 UI command 或 FrameInput，再由 Simulation 处理。

---

## 6. Netcode 禁止项

`src/net/**` 不能决定 gameplay 结果。它只能传输：

```text
FrameInput
InsightDecision
HashReport
Snapshot
ReconnectToken
```

Boss 弹幕、掉落、雷劫落点、奖励池结果必须由 Simulation + RNG 决定。

---

## 7. 内容数据规则

所有数据 ID 使用 ASCII snake_case：

```text
spell_five_thunder
artifact_qingshuang_sword
boss_qingyun_tribulation_spirit
```

中文名放在显示字段：

```json
{
  "id": "spell_five_thunder",
  "name": { "zhCN": "五雷正法" }
}
```

---

## 8. 状态哈希范围

进入 gameplay hash：

```text
玩家状态
敌人状态
Boss 状态
投射物状态
掉落物状态
真元、生命、冷却、丹药消化
团队灵气经验
个人修为
雷劫状态
救援进度
RNG state
```

不进入 hash：

```text
粒子
浮字
震屏
背景星星
音效
UI 动画
真实 FPS
网络 RTT
```
