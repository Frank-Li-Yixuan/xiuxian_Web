# 《测试与 CI 策略 v0.1》

## 1. 测试金字塔

```text
Unit Tests
  ↓
Content Validation Tests
  ↓
Headless Simulation Tests
  ↓
Determinism Tests
  ↓
Two-client Lockstep Tests
  ↓
Canvas Smoke Tests
```

---

## 2. Unit Tests

必须覆盖：

```text
SeededRng
pickWeighted
FixedTickRunner
StateHash
EntityManager
ObjectPool
FrameInput bitmask
Cooldown frame conversion
Pill digestion frame conversion
```

---

## 3. Content Validation

检查：

```text
所有 id 唯一
引用 id 存在
数值非负
权重总和 > 0
阶段 wave 时间不越界
Boss phase hpThreshold 合法
奖励池 condition 合法
```

命令：

```bash
npm run validate:data
```

---

## 4. Headless Simulation Tests

### test:headless:stage01:smoke

输入：固定 seed、固定空输入。  
断言：

```text
能跑完 1-1
没有 NaN
实体数量不爆
StateHash 可生成
```

### test:headless:stage01:full

输入：脚本化 P1/P2 移动和技能。  
断言：

```text
能跑完 1-5
至少触发 3 次顿悟
Boss 入场、转阶段、死亡
结算生成
```

---

## 5. Determinism Tests

### 同 seed 同 input

```text
Run A hash sequence == Run B hash sequence
```

### 不同 seed 不同结果

```text
Run seed 1 hash sequence != Run seed 2 hash sequence
```

### 视觉不影响 gameplay

```text
particles enabled hash == particles disabled hash
screen shake enabled hash == screen shake disabled hash
```

### 禁用模式检查

```bash
npm run check:forbidden
```

检查 gameplay 中是否出现：

```text
Math.random
Date.now
performance.now
document
window
canvas
requestAnimationFrame
```

---

## 6. Two-client Lockstep Tests

模拟：

```text
Client A = P1 local + P2 remote
Client B = P2 local + P1 remote
RTT = 100ms
packet loss = 2%
input delay = 4 frames
```

断言：

```text
hash 不分叉
顿悟奖励一致
雷劫落点一致
救援进度一致
Boss phase 一致
```

---

## 7. CI 推荐配置

每次 push：

```bash
npm run typecheck
npm run lint
npm test
npm run validate:data
npm run check:forbidden
```

每次 PR：

```bash
npm run test:determinism
npm run test:headless:stage01:smoke
```

每日或手动：

```bash
npm run test:headless:stage01:full
npm run test:net:two-client
npm run test:perf:entity-peak
```

---

## 8. 性能验收

第一版目标：

| 场景 | 指标 |
|---|---:|
| 1-4 妖潮压境 | 60 FPS 目标 |
| 同屏敌人峰值 | 35–55 |
| 同屏敌弹峰值 | 150–350 |
| 玩家弹幕峰值 | 200–500 |
| 碰撞测试 | 通过空间分桶降压 |
| 内存 | 长时间不持续增长 |

---

## 9. Telemetry

开发模式记录：

```text
平均 FPS
实体峰值
子弹峰值
每秒伤害
Boss 时长
受击次数
法术释放次数
丹药使用时间点
顿悟次数
修为增长来源
雷劫命中次数
```

这些数据写入 debug overlay 或本地 dev log，不进入正式存档。
