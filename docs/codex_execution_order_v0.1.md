# Codex 执行顺序：天命词条品质、互斥与重 Roll 系统 v0.1

请按顺序执行，避免一次性大改。

## DT-C001：数据 Schema 与 Registry

目标：接入 `data/destiny/*.json`，定义类型、校验数据。

验收：

- 所有 trait id 唯一。
- slotTypes 合法。
- quality 合法。
- flaw 必须有 calamitySeverity。
- exclusive/synergy 规则引用的 trait id 必须存在。

## DT-C002：天命生成器

目标：实现可复现的 `generateDestinyDraft(seed, locks, previousDraft)`。

验收：

- 同 seed 结果一致。
- 主天命、副天命、劫命按不同权重抽取。
- 结果不出现硬互斥。
- 高品质数量受限制。

## DT-C003：互斥与共鸣引擎

目标：实现 exclusive / synergy / soft conflict 检查。

验收：

- 互斥组合被重抽。
- 共鸣组合被识别并写入 draft。
- 相冲组合显示 warning，但不强制删除。

## DT-C004：重 Roll 与锁定

目标：接入创建角色页面，支持锁定槽位和重 Roll。

验收：

- 锁定槽位不变。
- 未锁槽位变化。
- 天机值随重 Roll 变化。
- 天机推演可揭示隐藏预兆或提高下一次品质权重。

## DT-C005：人生模拟与模式投射 Hook

目标：天命 modifiers 可被人生模拟、域外战场、局外洞府读取。

验收：

- modifier 不直接硬编码在 UI。
- 提供 `getLifeSimModifiers(draft)`。
- 提供 `getModeProjectionModifiers(profile, modeId)`。

## DT-C006：测试与遥测

目标：覆盖随机、互斥、锁定、共鸣、确认此生。

验收：

- 1000 次生成不报错。
- 无硬互斥结果。
- 分布大致符合品质表。
- 锁定重 Roll 稳定。
