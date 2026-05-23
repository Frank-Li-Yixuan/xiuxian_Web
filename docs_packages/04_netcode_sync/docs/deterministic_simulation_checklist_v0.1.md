# 确定性模拟检查清单 v0.1

这份清单供 Codex 和开发者在实现局内系统时逐项检查。任何一项不合格，都可能导致在线双人不同步。

---

## 1. 时间

- [ ] Gameplay 使用固定 60 FPS tick。
- [ ] 所有冷却使用 frame，不使用浮点秒。
- [ ] 丹药消化使用 frame。
- [ ] Boss 时间轴使用 frame。
- [ ] 雷劫持续时间使用 frame。
- [ ] `Date.now()` 不参与 gameplay。
- [ ] `performance.now()` 不参与 gameplay。
- [ ] `setTimeout` / `setInterval` 不改变 gameplay state。

---

## 2. 随机

- [ ] Gameplay 禁止调用 `Math.random()`。
- [ ] 视觉粒子可以调用 visual RNG，但不影响碰撞或伤害。
- [ ] 怪物刷新走 stage RNG。
- [ ] 掉落走 drop RNG。
- [ ] 顿悟奖励走 reward RNG。
- [ ] Boss 随机分支走 boss RNG。
- [ ] 雷劫落点走 tribulation RNG。
- [ ] RNG state 进入 gameplay hash。

---

## 3. 输入

- [ ] Combat Simulation 不直接读取 DOM 键盘状态。
- [ ] 输入先进入 InputBuffer。
- [ ] 本地输入写入 `currentFrame + inputDelayFrames`。
- [ ] 远端输入按 frame 插入。
- [ ] 同一帧缺任意玩家输入，不推进 simulation。
- [ ] `pressedMask` 用于法术/丹药触发。
- [ ] `downMask` 用于移动、专注、救援长按。

---

## 4. 实体顺序

- [ ] 所有实体有稳定 `entityId`。
- [ ] 同类实体按 `entityId ASC` 更新。
- [ ] Damage queue 排序后处理。
- [ ] Collision event 排序后处理。
- [ ] Drop spawn queue 排序后处理。
- [ ] 不用 Map/Set 未排序迭代结果影响玩法。

---

## 5. 坐标与数值

- [ ] Gameplay 使用固定逻辑分辨率。
- [ ] Canvas 缩放不影响碰撞。
- [ ] 移动速度、弹速、位置更新使用固定 tick。
- [ ] 对角线移动使用固定归一化常量。
- [ ] 自动索敌目标排序规则固定。
- [ ] 拾取归属规则固定。

---

## 6. 顿悟

- [ ] 灵气经验满触发顿悟，不是修为满。
- [ ] 顿悟奖励本地确定性生成。
- [ ] P1/P2 奖励生成顺序固定。
- [ ] 重 Roll 经服务器排序。
- [ ] 两人都确认后才恢复 gameplay。
- [ ] insight state 进入 hash。

---

## 7. 修为与雷劫

- [ ] 修为是个人状态。
- [ ] 修为增长来源明确且确定。
- [ ] 大境界瓶颈触发局内雷劫。
- [ ] 雷劫落点由 tribulation RNG 生成。
- [ ] 多人同时瓶颈按 playerId 排队。
- [ ] 雷劫 state 进入 hash。

---

## 8. UI 与视觉

- [ ] UI 只读 ViewState。
- [ ] UI 动画不改变 gameplay。
- [ ] 粒子不参与碰撞。
- [ ] 浮字不参与 gameplay。
- [ ] 音效不影响 gameplay。
- [ ] 屏幕震动不改变真实 hitbox。

---

## 9. 网络

- [ ] WebSocket relay 不模拟 gameplay。
- [ ] input_batch 可乱序到达，但按 frame 应用。
- [ ] insight_decision 必须由 serverSeq 排序。
- [ ] 每 120 帧上报 hash。
- [ ] Host 保存 snapshot ring buffer。
- [ ] 断线后可通过 snapshot 恢复。

---

## 10. 日志

- [ ] 每次 run 记录 runId、seed、dataPackHash。
- [ ] 记录 input batches。
- [ ] 记录 hash reports。
- [ ] 记录 desync frame。
- [ ] 记录 snapshot frame。
- [ ] 记录 insight decisions。
- [ ] 记录 tribulation triggers。

