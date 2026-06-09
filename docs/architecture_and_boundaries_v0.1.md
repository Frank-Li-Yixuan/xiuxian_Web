# LLM 叙事增强架构 v0.1

## 模块边界

```text
src/life-sim/**
  规则系统，生成事件、选择、结果，不依赖 LLM。

src/narrative/**
  叙事增强层，消费结构化事件，输出文本。

src/app/**
  UI 显示文本，不直接调用 DeepSeek。
```

## 推荐目录

```text
src/narrative/
  NarrativeRequestBuilder.ts
  NarrativeSanitizer.ts
  NarrativeCache.ts
  NarrativeSchemaValidator.ts
  NarrativeFallbackRenderer.ts
  DeepSeekNarrativeClient.ts
  NarrativeService.ts
  hiddenLeakDetector.ts
  promptTemplates/

src/server/narrative/
  deepseekProxy.ts   // 如果项目有 server 层，API key 只放这里
```

## 运行时流程

```ts
const request = buildNarrativeRequest(structuredEvent);
const safeRequest = sanitizeNarrativeRequest(request);
const cacheKey = buildNarrativeCacheKey(safeRequest);
const cached = await cache.get(cacheKey);
if (cached) return cached;

const response = llmEnabled
  ? await deepSeekClient.generate(safeRequest)
  : fallbackRenderer.render(safeRequest);

const valid = validateNarrativeResponse(response);
if (!valid.ok) return fallbackRenderer.render(safeRequest);

await cache.set(cacheKey, response);
return response;
```

## 不可变规则

- LifeSimulationState 的数值修改发生在规则层。
- LLM 输出永远不能回写 effects。
- LLM 输出只保存 narrativeText、toneTags、visibleHints、variantId。
- hidden trueName 永远不进入 LLM input。
