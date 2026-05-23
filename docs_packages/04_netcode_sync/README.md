# xiuxian_netcode_sync_v0_1

《联机同步技术设计 v0.1》文档包。

## 文件结构

```text
xiuxian_netcode_sync_v0_1/
  README.md
  docs/
    online_sync_technical_design_v0.1.md
    deterministic_simulation_checklist_v0.1.md
  data/
    netcode/
      sync_protocol.v0.1.json
      event_types.v0.1.json
      rollback_config.v0.1.json
      desync_test_scenarios.v0.1.json
  src/
    types/
      netcode-types.v0.1.ts
  diagrams/
    lockstep_flow.mmd
```

## 核心结论

v0.1 在线联机采用：

```text
确定性帧同步 + 输入延迟缓冲 + Seeded RNG + 状态哈希 + Host 快照修正
```

不采用：

```text
每帧同步所有子弹/敌人/掉落物的全量状态同步
```

## 给 Codex 的优先任务

1. 先实现 `netcode-types.v0.1.ts`。
2. 建立 `FixedTickRunner` 和 `InputBuffer`。
3. 重构战斗逻辑，使其不直接读取 DOM 键盘状态。
4. 将 gameplay 中所有 `Math.random()` 替换为分层 Seeded RNG。
5. 实现 WebSocket Relay mock。
6. 实现 hash report 与 snapshot repair。
7. 最后接入顿悟、雷劫、救援等高风险联机事件。
