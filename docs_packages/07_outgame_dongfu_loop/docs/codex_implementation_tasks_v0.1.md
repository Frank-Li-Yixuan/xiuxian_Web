# 《局外洞府最小闭环 v0.1》Codex 实施任务

目标：在已有局内垂直切片、数值、UI、工程架构基础上，实现第一版局外闭环。

---

## OUT-C001：Outgame Types 与 Profile State

目标：建立局外存档、资源、建筑、配装、结算的数据类型。

修改范围：

```text
src/types/outgame-types.v0.1.ts
src/outgame/state/
src/outgame/profile/
```

验收：

```text
OutgameProfileState 可创建默认存档。
ResourceWallet 可增减资源。
LoadoutState 可序列化。
Profile 包含 saveVersion。
```

禁止：

```text
不要接 UI。
不要接 localStorage。
不要接局内 sim。
```

---

## OUT-C002：Content Registry 接入局外 JSON

目标：让局外系统读取资源、建筑、功法、炼丹、炼器、突破数据。

修改范围：

```text
data/outgame/*.json
src/content/ContentRegistry.ts
src/outgame/content/
```

验收：

```text
所有 outgame JSON 可以被 validate。
资源 id 引用正确。
配方引用资源均存在。
建筑升级引用资源均存在。
```

---

## OUT-C003：RunSettlementReceipt 应用

目标：局内结束后通过 Receipt 将奖励写入局外 Profile。

修改范围：

```text
src/outgame/settlement/
src/types/outgame-types.v0.1.ts
```

验收：

```text
Receipt 可应用一次。
重复 Receipt 不会重复入库。
不同难度倍率正确。
单人/本地双人/在线双人策略可配置。
```

---

## OUT-C004：ResourceWallet 与材料钱包

目标：实现资源增减、检查、消耗、交易事务。

验收：

```text
wallet.has(cost) 正确。
wallet.spend(cost) 失败不修改状态。
wallet.add(rewards) 正确累加。
事务日志可用于 Debug。
```

---

## OUT-C005：Idle 聚灵阵系统

目标：根据离线时间产出修为和灵石。

验收：

```text
IdleState 记录 lastClaimAt。
收益受 offlineCap 限制。
聚灵阵等级影响收益。
收菜后更新时间戳。
Debug 可模拟离线 4 小时。
```

禁止：

```text
不要用 Date.now() 写死在核心逻辑。
必须由调用方传入 nowMs，便于测试。
```

---

## OUT-C006：藏经阁修功系统

目标：实现功法解锁、修炼队列、并修效率惩罚。

验收：

```text
可解锁功法。
可把 1–3 本功法加入修炼。
并修数量降低总效率。
元素冲突/相生可影响效率。
功法升级会修改永久加成。
```

---

## OUT-C007：藏经阁研法系统

目标：实现法术永久熟练度 masteryLevel。

验收：

```text
可用法术残页解锁法术。
可升级 masteryLevel。
Loadout 装备法术时读取 masteryLevel。
空槽进入局内仍合法。
```

---

## OUT-C008：炼丹房

目标：实现配方、丹药库存、永久丹、丹毒。

验收：

```text
回春丹/燃血丹/清心丹可炼制。
洗髓丹/益气丹/凝神丹能永久加属性。
永久丹增加丹毒。
清丹毒配方可降低丹毒。
材料不足时不能炼。
```

---

## OUT-C009：炼器阁

目标：实现本命法宝与灵宝解锁/升星。

验收：

```text
青霜飞剑、紫阳葫芦、玄岳重印可升到 3 星。
四个灵宝可升到 3 星。
升星消耗材料。
升星效果可被 Loadout 读取。
```

---

## OUT-C010：Loadout Builder

目标：局外配置下局装备。

验收：

```text
主修心法 1 个。
本命法宝 1 个。
灵宝 0–2 个。
法术 0–4 个。
丹药 0–3 个。
空槽合法。
非法 id 或未解锁物品不能装备。
```

---

## OUT-C011：劫雷台入口

目标：实现练气九层 → 筑基的局外突破入口与结算。

验收：

```text
修为未满不能进入。
材料不足不能进入。
进入时生成 BreakthroughTrialConfig。
成功后境界变筑基。
失败后材料按规则消耗，修为停留瓶颈。
```

v0.1 可以先接 Headless 测试，不必立刻做完整雷劫关卡渲染。

---

## OUT-C012：洞府总览 ViewState

目标：提供 UI 所需的洞府首页数据。

验收：

```text
显示资源摘要。
显示修为/境界。
显示聚灵阵可领取收益。
显示推荐闭关事项 top 3。
显示当前 Loadout。
```

---

## OUT-C013：Outgame Persistence Adapter

目标：接入本地存档。

验收：

```text
可保存 Profile。
可读取 Profile。
存档包含 saveVersion。
损坏存档有 fallback。
重复结算 receiptId 不重复应用。
```

注意：核心 outgame logic 不直接读 localStorage。Persistence Adapter 负责读写。

---

## OUT-C014：Outgame Integration Test

目标：验证完整闭环。

测试脚本：

```text
创建默认 Profile
应用第一大阶段通关 Receipt
收取 2 小时聚灵阵收益
炼制回春丹
青霜飞剑升 2 星
修炼锐金诀到 2 层
配置 Loadout
生成 RunConfig
```

验收：

```text
整个流程无异常。
资源余额正确。
RunConfig 包含正确局外带入。
```
