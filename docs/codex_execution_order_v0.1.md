# Codex 执行顺序 v0.1

不要一次性实现全部。按下面顺序逐步投喂 Codex。

---

## A18-C001：数据 Schema 与 Registry

目标：接入 JSON 数据、类型和校验脚本。

交付：

```text
Age18AwakeningRegistry
JSON data loaders
validate_age18_data.mjs
基础类型导入
```

---

## A18-C002：觉醒结算引擎

目标：实现 `resolveAge18Awakening(input)`。

交付：

```text
最终属性读取
觉醒评分
隐藏命揭示入口
随身物转化入口
天命投射入口
系统消息生成
```

---

## A18-C003：属性转化与第一战修正

目标：把 FinalLifeStats 转为第一战 combat stats。

交付：

```text
softCap
maxHp / maxQi / pickupRadius / crit / qiRegen 公式
伤病 / 功德 / 业力修正
第一战修正数据结构
```

---

## A18-C004：隐藏命揭示与随身物转化

目标：实现隐藏血脉揭示概率与随身物转换。

交付：

```text
resolveHiddenFateReveal
resolveCarriedItemConversion
不泄露真名的 visible result
18 岁解析日志
```

---

## A18-C005：域外战场第一战 RunConfig

目标：从觉醒结算生成第一战配置。

交付：

```text
OuterBattlefieldIntroRunConfig
初始 Loadout
scenario phases
tutorial steps
failure policy
```

---

## A18-C006：系统家园开启计划

目标：第一战成功后生成洞府开启计划。

交付：

```text
SystemHomeUnlockPlan
模块初始解锁
originBasedBonuses
initialResources
nextObjectives
```

---

## A18-C007：UI Flow 集成

目标：把人生模拟 216 月接到 18 岁觉醒页面，再接第一战，再接洞府开启。

交付：

```text
Age18AwakeningScreen
OuterBattlefieldIntroBriefingScreen
SystemHomeUnlockScreen
routing save stage integration
```

---

## A18-C008：测试与遥测

目标：覆盖确定性、泄露、失败重试、洞府开启。

交付：

```text
seed determinism tests
hidden fate leak tests
item conversion tests
first battle run config tests
home unlock tests
profile resume tests
```
