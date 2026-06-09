# 《DeepSeek / LLM 叙事增强管线 v0.1》

## 1. 系统定位

本系统服务于 0–18 岁人生模拟，不负责游戏逻辑本身。

它的输入不是自由文本，而是已经由规则系统生成的结构化事件：

```text
九宫命盘
  → 天命成立与变异
  → 身世 / 隐藏命 / 随身物
  → 月度事件
  → 半年选择
  → 玩法插曲结果
  → 阶段转化
```

LLM 的职责是把这些结构化结果写成好读、有修仙世界感、有个人命运感的文本。

## 2. 绝对边界

### 允许 LLM 做

```text
月度事件日志润色
半年重大选择描述润色
选项文案改写
玩法插曲前后叙事
阶段总结
18 年人生小传
同一事件的多种风格变体
NPC 口吻变化
```

### 禁止 LLM 做

```text
决定哪个事件发生
决定属性加减
决定成功/失败
决定隐藏血脉进度
决定是否进入玩法插曲
决定是否转阶段
决定 18 岁觉醒路径
泄露 hidden trueName
生成新天命、新道具、新功法直接写入存档
绕过本地 JSON schema
```

一句话：

> 规则引擎管命运，LLM 管叙事表达。

## 3. API 能力假设

DeepSeek API 官方文档说明：

- DeepSeek API 提供 OpenAI/Anthropic 兼容接口。
- `deepseek-v4-pro` 与 `deepseek-v4-flash` 支持 JSON Output、Tool Calls、thinking / non-thinking modes。
- JSON Output 需要设置 `response_format: { type: "json_object" }`，并在 prompt 中包含 “json” 与目标 JSON 示例。

工程上应把这些能力当作“可用但必须校验”的外部服务，而不是可信本地规则。

## 4. 核心数据流

```text
StructuredEvent
  ↓ sanitize / redact
NarrativeRequest
  ↓ cacheKey
LLM or local template
  ↓ JSON parse
NarrativeResponse
  ↓ schema validation
  ↓ hidden leak detection
  ↓ style / length / tag validation
NarrativeLogEntry
  ↓ save profile
UI 展示
```

## 5. 请求类型

v0.1 定义 8 类任务：

```text
monthly_event_log
major_choice_intro
major_choice_options
interlude_intro
interlude_result
stage_transition_summary
age18_awakening_log
life_chronicle_summary
```

每类任务都有严格输入、输出 schema 和 fallback 模板。

## 6. 安全脱敏

所有进入 LLM 的隐藏信息必须经过脱敏：

```text
hidden_fate_ancient_thunder_blood → thunder_omen
hidden_fate_dan_sage_bone → alchemy_omen
hidden_fate_system_resonance → system_static_omen
```

LLM 输入中不能出现：

```text
古雷真血
丹圣遗骨
系统共鸣体
前世剑魄
魔印微痕
真实 hiddenFateId
```

可以出现：

```text
雷云深处的战鼓
陌生火候
耳边断续杂音
木剑低鸣
荒祠黑影
```

## 7. 输出 JSON Schema

每次 LLM 输出必须是 JSON 对象：

```json
{
  "version": "0.1",
  "taskId": "monthly_event_log",
  "text": "暴雨夜，你蜷在被中，骨节深处却一阵阵发热。",
  "toneTags": ["mysterious", "restrained"],
  "visibleHints": ["雷声似乎离你更近了一些"],
  "safetyFlags": []
}
```

UI 展示只使用 `text` 和可见提示字段；结构化效果继续来自规则引擎。

## 8. 缓存与复现

LLM 文案可以有变化，但同一个存档中的同一个事件必须可复现。因此必须生成 cacheKey：

```text
profileId
characterId
seed
ageMonth
eventId
choiceId/resultId
requestVersion
promptTemplateVersion
locale
```

同一 cacheKey 如果已存在文本，直接读取缓存，不再请求 LLM。

## 9. 失败兜底

任何外部请求失败、超时、JSON 无效、触发泄露检测，都使用本地模板。

兜底等级：

```text
1. event-specific fallback
2. category fallback
3. generic phase fallback
4. 最短安全文本
```

绝不能因为 LLM 失败导致人生模拟卡死。

## 10. 语言与风格

默认文本风格：

```text
古雅但不艰涩
修仙世界观
含蓄预兆
不剧透隐藏真名
不现代化
短句优先
少用网络梗
少用堆砌形容词
```

长度建议：

| 任务 | 长度 |
|---|---:|
| 月度日志 | 40–100 字 |
| 半年选择描述 | 80–160 字 |
| 单个选项 | 12–32 字 |
| 插曲结果 | 60–140 字 |
| 阶段总结 | 120–240 字 |
| 18 年人生小传 | 300–600 字 |

## 11. DeepSeek 使用策略

建议：

```text
开发阶段：默认关闭 LLM，使用模板和 /dev 工具调试。
本地可选：通过 env 开启 DEEPSEEK_API_KEY。
正式构建：默认走本地模板，除非用户明确启用云叙事增强。
```

如果启用 DeepSeek：

```text
简单月度事件可用 deepseek-v4-flash。
阶段总结、人生小传可用 deepseek-v4-pro。
必须设置 JSON Output。
必须设置 timeout。
必须缓存。
必须保留 fallback。
```

## 12. 隐私与密钥

禁止：

```text
把 API key 写入前端 bundle
把玩家完整存档原样发给 LLM
把 hidden trueName 发给 LLM
把付费 API 请求放在高频月度推进里无节制调用
```

推荐：

```text
本地 dev proxy 或 server-side endpoint
请求前脱敏
按任务限流
按 cacheKey 缓存
可在设置里关闭云叙事增强
```
