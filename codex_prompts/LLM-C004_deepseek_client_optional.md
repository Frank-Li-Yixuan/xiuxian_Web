# LLM-C004：DeepSeek 客户端，可选启用

目标：实现可关闭的 DeepSeekNarrativeClient。

硬约束：
- API key 不进入前端 bundle。
- 默认关闭云叙事。
- LLM 失败必须 fallback。
- 必须使用 JSON Output。

任务：
1. 创建 DeepSeekNarrativeClient 接口。
2. 若项目有 server/dev proxy，在服务端读取 DEEPSEEK_API_KEY。
3. 请求模型名通过 env 配置，默认 monthly 使用 deepseek-v4-flash，summary 使用 deepseek-v4-pro。
4. 设置 response_format: { type: 'json_object' }。
5. 设置 timeout 与 max_tokens。
6. JSON parse / schema validate / leak detect。
7. 失败 fallback。

测试：
- 无 API key 时 fallback。
- mock 无效 JSON 时 fallback。
- mock 泄露 hidden trueName 时 fallback。
