# Carried Item Lifecycle v0.2

## 1. 随身物定位

随身物是“此生记忆锚点”，不是一次性初始装备。

它具有四种作用：

```text
事件触发器
隐藏命共鸣器
玩法插曲钥匙
18 岁转化材料
```

## 2. 生命周期

```text
obtained
  → noticed
  → resonating
  → tested
  → damaged / deepened
  → converted
  → inherited
```

## 3. 随身物亲和度

```text
affinity: 0–100
```

亲和度来源：

```text
月度事件
半年选择
玩法插曲结果
隐藏命匹配
天命匹配
身世匹配
关键失败/成功
```

## 4. 转化带

| 亲和 | 结果 |
|---:|---|
| 0–29 | 普通转化 |
| 30–59 | 良好转化 |
| 60–79 | 特殊转化 |
| 80–99 | 高级转化 |
| 100+ | 命定转化 |

## 5. 示例：残破木剑

```text
noticed:
  你发现它虽是木剑，却怎么也折不断。

resonating:
  夜深时，木剑似有低鸣。

tested:
  你在竹林中试剑，风声像被切开。

converted:
  青霜飞剑·残 / 剑魄回响 / 前世剑魄线索
```

## 6. 示例：药铺铜炉

```text
noticed:
  铜炉虽旧，炉底却没有药渣焦痕。

resonating:
  你梦见有人用它炼一炉无名丹。

tested:
  药炉火候选择，可能触发守炉玩法或火候判定。

converted:
  回春丹、残炉火候、炼丹房初始经验
```

## 7. 示例：黑骨短笛

```text
noticed:
  你不知它是什么骨，却总觉得它在夜里变冷。

resonating:
  月夜里，短笛孔中似有白雾。

tested:
  吹响它可能引来魂影，也可能惊动心魔。

converted:
  魂修线索、心魔投射、太阴/魔印进度
```
