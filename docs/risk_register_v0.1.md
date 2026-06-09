# 风险登记 v0.1

| 风险 | 严重度 | 说明 | 缓解 |
|---|---:|---|---|
| Codex 恢复旧 PNG 控件 | 高 | 旧 prompt 中仍有 PNG 控件方案 | 全局前缀 + CC-C 废弃 |
| 隐藏命泄露 | 高 | trueName 进入 DOM/LLM/日志 | Sanitizer + visible model test |
| LLM 改规则 | 高 | LLM 输出数值或奖励 | JSON schema 禁止 effects 字段 |
| 人生模拟流水账 | 高 | 月度事件没有主线推进 | Storyline + Density Controller |
| 玩法插曲太频繁 | 中高 | 打断人生模拟节奏 | Interlude budget + cooldown |
| 阶段转化太硬 | 中 | 18 岁强制域外造成割裂 | Adult path scoring + fallback |
| 数据 ID 不兼容 | 中 | v0.1/v0.2 数据并存 | Adapter + migration matrix |
| 测试绿但体验差 | 高 | 只测功能不测截图 | E2E screenshots + playtest report |
| 过早打磨 STG | 中高 | 主链未通就继续做战斗 | STG-R 延后 |
| 存档不可恢复 | 高 | pending choice/interlude 结果刷新变化 | Cache + seeded + persistence tests |
